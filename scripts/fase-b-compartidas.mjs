/**
 * Fase B: auditoría de imágenes compartidas entre SKUs.
 * Uso: node scripts/fase-b-compartidas.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROD_DIR = path.join(ROOT, 'src', 'content', 'productos');
const OUT = path.join(ROOT, 'docs', 'imagenes-compartidas.md');
const METRICS = path.join(ROOT, 'docs', 'metricas-imagenes.md');

function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[mm[1]] = v;
  }
  return out;
}

function normalizeKey(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Extrae tokens de potencia/capacidad para detectar mismatch. */
function powerTokens(fm) {
  const blob = [fm.power, fm.model, fm.sku, fm.title].filter(Boolean).join(' ');
  const toks = new Set();
  for (const m of blob.matchAll(/(\d+[.,]?\d*)\s*(kwh|kw|w|va|ah|v)\b/gi)) {
    toks.add(`${m[1].replace(',', '.')}${m[2].toLowerCase()}`);
  }
  for (const m of blob.matchAll(/\b(\d{2,4})\s*[Ww]\b/g)) toks.add(`${m[1]}w`);
  return [...toks];
}

function cellHint(fm) {
  const blob = [fm.title, fm.model, ...(fm.specifications || [])].join(' ').toLowerCase();
  const m = blob.match(/(\d+)\s*celdas?/);
  return m ? m[1] : null;
}

const products = [];
for (const f of fs.readdirSync(PROD_DIR).filter((x) => x.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(PROD_DIR, f), 'utf8');
  const fm = parseFm(raw);
  if (String(fm.draft) === 'true') continue;
  const src = fm.imageOriginal || fm.image || '';
  products.push({
    slug: f.replace(/\.md$/, ''),
    title: fm.title,
    brand: fm.brand || '',
    model: fm.model || fm.sku || '',
    power: fm.power || '',
    category: fm.category || '',
    image: fm.image || '',
    source: src,
    provisional: String(fm.imagen_provisional) === 'true',
    powers: powerTokens(fm),
    cells: cellHint(fm),
  });
}

const bySource = new Map();
for (const p of products) {
  const key = p.source || p.image;
  if (!key) continue;
  if (!bySource.has(key)) bySource.set(key, []);
  bySource.get(key).push(p);
}

const shared = [...bySource.entries()]
  .filter(([, list]) => list.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

function needsReview(list) {
  const cats = new Set(list.map((p) => p.category));
  if (cats.size > 1) return { revisar: true, why: 'categorías distintas' };

  const sensitive = ['paneles', 'baterias', 'inversores'].includes(list[0].category);
  if (!sensitive) {
    // aún así si potencias muy distintas
    const allPowers = new Set(list.flatMap((p) => p.powers));
    if (allPowers.size > 1 && list.length > 1) {
      return { revisar: true, why: `potencias distintas: ${[...allPowers].join(', ')}` };
    }
    return { revisar: false, why: '' };
  }

  const powers = new Set(list.flatMap((p) => p.powers));
  const models = new Set(list.map((p) => normalizeKey(p.model)).filter(Boolean));
  const cells = new Set(list.map((p) => p.cells).filter(Boolean));

  if (powers.size > 1)
    return { revisar: true, why: `potencia/capacidad distinta: ${[...powers].join(', ')}` };
  if (models.size > 1)
    return { revisar: true, why: `modelos distintos: ${[...models].slice(0, 6).join(', ')}` };
  if (cells.size > 1)
    return { revisar: true, why: `nº celdas distinto: ${[...cells].join(', ')}` };
  return { revisar: false, why: '' };
}

const lines = [
  '# Imágenes compartidas entre SKUs',
  '',
  `Actualizado: ${new Date().toISOString().slice(0, 10)}`,
  '',
  `Fuentes usadas por más de un SKU: **${shared.length}**`,
  '',
  'Marca **revisar** cuando la misma foto cubre potencias, modelos o nº de celdas distintos (sobre todo paneles, baterías e inversores). En esos casos preferir `imagen_provisional` o foto oficial por modelo.',
  '',
];

let revisarCount = 0;
for (const [src, list] of shared) {
  const { revisar, why } = needsReview(list);
  if (revisar) revisarCount++;
  const flag = revisar ? ` **REVISAR** — ${why}` : ' ok (misma familia aparente)';
  lines.push(`## \`${src}\``);
  lines.push('');
  lines.push(`- SKUs: **${list.length}** ·${flag}`);
  lines.push('');
  lines.push('| Slug | Marca | Modelo | Potencia | Categoría | Provisional |');
  lines.push('|---|---|---|---|---|---|');
  for (const p of list) {
    lines.push(
      `| ${p.slug} | ${p.brand} | ${p.model} | ${p.power || '—'} | ${p.category} | ${p.provisional ? 'sí' : 'no'} |`
    );
  }
  lines.push('');
}

fs.writeFileSync(OUT, lines.join('\n'), 'utf8');

// Append metrics note
let metrics = '';
if (fs.existsSync(METRICS)) metrics = fs.readFileSync(METRICS, 'utf8');
if (!metrics.includes('## Tras Fase B')) {
  metrics += [
    '',
    '## Tras Fase B (compartidas)',
    '',
    `- Fuentes compartidas: **${shared.length}**`,
    `- Marcadas REVISAR: **${revisarCount}**`,
    `- Detalle: \`docs/imagenes-compartidas.md\``,
    '',
  ].join('\n');
  fs.writeFileSync(METRICS, metrics, 'utf8');
}

console.log(`Fase B: ${shared.length} fuentes compartidas, ${revisarCount} revisar`);
console.log('Escrito:', path.relative(ROOT, OUT));
