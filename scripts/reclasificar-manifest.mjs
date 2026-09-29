/**
 * Reclasifica imagenes-proveedores/manifest.csv sin re-descargar.
 * Aplica reglas de tipo + descarta 250×250 y fuentes < 800 px del lote.
 *
 * node scripts/reclasificar-manifest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { classifyMatchStrict } from './lib/match-tipos.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'imagenes-proveedores', 'manifest.csv');
const OUT = path.join(ROOT, 'imagenes-proveedores', 'manifest-reclasificado.csv');
const CHANGES = path.join(ROOT, 'docs', 'manifest-cambios.md');
const RESUMEN = path.join(ROOT, 'imagenes-proveedores', 'resumen-reclasificado.md');
const PROD = path.join(ROOT, 'src', 'content', 'productos');

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ''));
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  const specs = [];
  let inSpecs = false;
  for (const line of m[1].split(/\r?\n/)) {
    if (/^specifications:/.test(line)) {
      inSpecs = true;
      continue;
    }
    if (inSpecs) {
      const sm = line.match(/^\s*-\s*"(.*)"\s*$/) || line.match(/^\s*-\s*(.*)$/);
      if (sm) {
        specs.push(sm[1]);
        continue;
      }
      if (/^\w+:/.test(line)) inSpecs = false;
      else continue;
    }
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[mm[1]] = v;
  }
  out.specifications = specs;
  return out;
}

function loadProduct(slug) {
  const p = path.join(PROD, `${slug}.md`);
  if (!fs.existsSync(p)) return { slug, title: slug };
  return { slug, ...parseFm(fs.readFileSync(p, 'utf8')) };
}

function pageFromNotas(notas) {
  const m = String(notas || '').match(/page=(https?:\/\/\S+)/);
  return m ? m[1] : '';
}

function isDiscardSize(row) {
  if (String(row.formato || '').toLowerCase() === 'pdf') return { discard: false };
  const w = Number(row.ancho) || 0;
  const h = Number(row.alto) || 0;
  if (!w && !h) return { discard: false };
  // secondary thumbs often exactly 250x250
  if (w === 250 && h === 250) return { discard: true, why: '250x250 secundaria' };
  const side = Math.max(w, h);
  if (side > 0 && side < 800) return { discard: true, why: `fuente ${side}px < 800px` };
  return { discard: false };
}

const raw = fs.readFileSync(MANIFEST, 'utf8');
const rows = parseCsv(raw);
const productCache = new Map();
const changes = [];
const skuBest = new Map(); // slug -> best match among kept image rows

  const headers = [
  'sku',
  'producto',
  'proveedor',
  'url_origen',
  'archivo_local',
  'ancho',
  'alto',
  'formato',
  'transparente',
  'match',
  'notas',
  'match_original',
  'descartado',
  'motivo',
];

const outRows = [];
let discarded = 0;

for (const row of rows) {
  const slug = row.sku;
  if (!productCache.has(slug)) productCache.set(slug, loadProduct(slug));
  const product = productCache.get(slug);

  const size = isDiscardSize(row);
  const page = pageFromNotas(row.notas);
  // Solo URL remota + página. NO archivo_local (la carpeta local lleva el SKU y falsea "exacto").
  const hay = `${row.url_origen} ${page}`;
  // Si ya hubo un pase, match_previo/match_original guarda el match del download original.
  const baseline = row.match_original || row.match_previo || row.match || '';
  const prev = baseline;

  let next = prev;
  let motivo = '';

  if (String(row.formato || '').toLowerCase() === 'pdf') {
    const r = classifyMatchStrict(product, '', page || row.url_origen, hay);
    next = r.match || '';
    motivo = r.reason || '';
  } else if (size.discard) {
    next = '';
    motivo = size.why;
    discarded++;
  } else {
    const r = classifyMatchStrict(product, '', page || row.url_origen, hay);
    next = r.match || '';
    motivo = r.reason || '';
  }

  if (prev !== next) {
    changes.push({
      sku: slug,
      archivo: row.archivo_local,
      prev: prev || '(vacío)',
      next: next || '(rechazado)',
      motivo,
    });
  }

  const descartado = size.discard ? 'si' : 'no';
  outRows.push({
    ...row,
    match: next,
    match_original: baseline,
    descartado,
    motivo,
  });

  if (!size.discard && next && String(row.formato || '').toLowerCase() !== 'pdf') {
    const rank = next === 'exacto' ? 3 : next === 'serie' ? 2 : next === 'dudoso' ? 1 : 0;
    const cur = skuBest.get(slug);
    if (!cur || rank > cur.rank) skuBest.set(slug, { match: next, rank });
  }
}

// write CSV
const lines = [headers.join(',')];
for (const r of outRows) {
  lines.push(headers.map((h) => csvEscape(r[h])).join(','));
}
fs.writeFileSync(OUT, lines.join('\n') + '\n');
// also replace active manifest used for lote decisions
fs.writeFileSync(MANIFEST, lines.join('\n') + '\n');

const skuExact = [...skuBest.values()].filter((x) => x.match === 'exacto').length;
const skuSerie = [...skuBest.values()].filter((x) => x.match === 'serie').length;
const skuDudoso = [...skuBest.values()].filter((x) => x.match === 'dudoso').length;
const fileExact = outRows.filter((r) => r.descartado !== 'si' && r.match === 'exacto').length;
const fileSerie = outRows.filter((r) => r.descartado !== 'si' && r.match === 'serie').length;
const fileDudoso = outRows.filter((r) => r.descartado !== 'si' && r.match === 'dudoso').length;

const resumen = [
  '# Resumen reclasificación manifest',
  '',
  `Actualizado: ${new Date().toISOString()}`,
  '',
  '## Cobertura por tipo de match (SKUs, mejor fila imagen no descartada)',
  '',
  '| Match | SKUs |',
  '|---|---:|',
  `| exacto | ${skuExact} |`,
  `| serie | ${skuSerie} |`,
  `| dudoso | ${skuDudoso} |`,
  `| con alguna imagen válida | ${skuBest.size} |`,
  '',
  `Filas imagen/PDF no descartadas: exacto=${fileExact}, serie=${fileSerie}, dudoso=${fileDudoso}`,
  `Filas descartadas (250×250 o <800px): **${discarded}**`,
  `Filas con match cambiado: **${changes.length}**`,
  '',
  'Detalle cambios: `docs/manifest-cambios.md`',
  '',
].join('\n');
fs.writeFileSync(RESUMEN, resumen);

const cambiosMd = [
  '# Cambios de match tras reglas de tipo',
  '',
  `Total filas que cambiaron: **${changes.length}**`,
  '',
  '| SKU | Archivo | Antes | Después | Motivo |',
  '|---|---|---|---|---|',
  ...changes.map(
    (c) =>
      `| ${c.sku} | \`${path.basename(c.archivo)}\` | ${c.prev} | ${c.next} | ${c.motivo.replace(/\|/g, '/')} |`
  ),
  '',
].join('\n');
fs.writeFileSync(CHANGES, cambiosMd);

console.log(resumen);
console.log('Cambios (primeros 40):');
for (const c of changes.slice(0, 40)) {
  console.log(`  ${c.prev} → ${c.next} | ${c.sku} | ${c.motivo}`);
}
if (changes.length > 40) console.log(`  … +${changes.length - 40} más en docs/manifest-cambios.md`);
