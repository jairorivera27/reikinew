/**
 * Ajustes post-revisión + lote seeds + decisiones REVISAR.
 * Uso: node scripts/fase-c-post-revision.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PROD = path.join(ROOT, 'src/content/productos');
const SHARED = path.join(ROOT, 'docs/imagenes-compartidas.md');
const NOSIRVE = path.join(ROOT, 'docs/imagenes-no-sirven.md');
const CSV = path.join(ROOT, 'docs/fuentes-imagenes.csv');
const DECISIONES = path.join(ROOT, 'docs/revisar-decisiones.md');

function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { fm: {}, body: raw, rawFm: '' };
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[mm[1]] = v;
  }
  return { fm: out, body: raw.slice(m[0].length), rawFm: m[1] };
}

function set(text, key, val) {
  if (val === undefined) return text;
  const line = typeof val === 'boolean' ? `${key}: ${val}` : `${key}: "${String(val).replace(/"/g, '\\"')}"`;
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  return re.test(text) ? text.replace(re, line) : `${text}\n${line}`;
}

function writeMd(mdPath, rawFm, body) {
  fs.writeFileSync(mdPath, `---\n${rawFm}\n---${body}`, 'utf8');
}

function loadAll() {
  const map = new Map();
  for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md'))) {
    const slug = f.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(PROD, f), 'utf8');
    const parsed = parseFm(raw);
    map.set(slug, { slug, mdPath: path.join(PROD, f), ...parsed });
  }
  return map;
}

// ——— 1) Ocultar SKUs sin imagen ———
const HIDE = [
  'inversor-solar-on-grid-goodwe-3kw-gw3000-xs-30',
  'medidor-de-energia-goodwe-gm330',
];
for (const slug of HIDE) {
  const p = path.join(PROD, `${slug}.md`);
  const raw = fs.readFileSync(p, 'utf8');
  const { body, rawFm } = parseFm(raw);
  let fm = set(rawFm, 'draft', true);
  fm = set(fm, 'imagenPendiente', true);
  writeMd(p, fm, body);
  console.log('oculto draft:', slug);
}

// ——— 2) Seeds: fichaPdf público + sin provisional ———
const SEEDS = [
  {
    slug: 'cat-mayorista-d99eecbc0d48',
    pdf: '/fichas/hoymiles-hmt-2000-4t-208-ficha.pdf',
  },
  {
    slug: 'cat-mayorista-595127324da8',
    pdf: '/fichas/hoymiles-hms-800-2t-ficha.pdf',
  },
  {
    slug: 'cat-mayorista-dbd01c55a288',
    pdf: null, // se descarga aparte si falta
  },
  {
    slug: 'controlador-de-carga-solar-mppt-victron-scc110050210',
    pdf: null,
  },
];

for (const s of SEEDS) {
  const p = path.join(PROD, `${s.slug}.md`);
  const raw = fs.readFileSync(p, 'utf8');
  const { body, rawFm } = parseFm(raw);
  let fm = set(rawFm, 'imagen_provisional', false);
  fm = set(fm, 'imagenPendiente', false);
  if (s.pdf) fm = set(fm, 'fichaPdf', s.pdf);
  writeMd(p, fm, body);
  console.log('seed listo:', s.slug);
}

// ——— 3) CSV autorización ———
const authDate = '2026-09-28';
let csv = fs.readFileSync(CSV, 'utf8').trim().split(/\r?\n/);
const header = csv[0];
const cols = header.split(',');
if (!cols.includes('autorizado')) {
  csv[0] = header + ',autorizado,fecha_autorizacion';
}
csv = csv.map((line, i) => {
  if (i === 0) return csv[0];
  if (!line.trim()) return line;
  if (/,si,2026-09-28$/.test(line)) return line;
  if (/solaire|autosolar/i.test(line) && !/,si,/.test(line)) {
    return `${line},si,${authDate}`;
  }
  return line;
});
fs.writeFileSync(CSV, csv.join('\n') + '\n');
console.log('CSV autorización actualizado');

// ——— 4) REVISAR decisiones ———
const all = loadAll();
const sharedMd = fs.readFileSync(SHARED, 'utf8');
const sections = sharedMd.split(/\n## `/).slice(1);
const decisions = [];

/** Cuenta cuántos SKUs usan la misma imageOriginal o image. */
function usersOfSource(src, products) {
  return products.filter(
    (p) => (p.fm.imageOriginal || p.fm.image) === src || p.fm.image === src
  );
}

for (const sec of sections) {
  const firstLine = sec.split('\n')[0];
  const src = firstLine.replace(/`.*$/, '').replace(/`$/, '');
  if (!/\*\*REVISAR\*\*/.test(sec)) continue;

  const why = (sec.match(/\*\*REVISAR\*\* — ([^\n]+)/) || [])[1] || 'mismatch';
  const rows = [...sec.matchAll(/^\| ([a-z0-9-]+) \|/gm)].map((m) => m[1]);

  for (const slug of rows) {
    const p = all.get(slug);
    if (!p) continue;
    const ownOrig = p.fm.imageOriginal || '';
    const currentImg = p.fm.image || '';
    // "foto propia" = imageOriginal único (solo este SKU) o image estudio no compartida
    const origUsers = [...all.values()].filter(
      (x) => (x.fm.imageOriginal || '') === ownOrig && ownOrig
    );
    const imgUsers = [...all.values()].filter((x) => x.fm.image === currentImg && currentImg);
    const hasOwn =
      (ownOrig && origUsers.length === 1 && !/placeholders\//i.test(ownOrig)) ||
      (currentImg.includes('productos-estudio') &&
        imgUsers.length === 1 &&
        String(p.fm.imagen_provisional) === 'true');

    if (hasOwn && String(p.fm.imagen_provisional) !== 'true') {
      // Ya tiene foto propia definitiva — no tocar
      decisions.push({
        slug,
        src,
        why,
        decision: 'mantener_propia',
        detail: 'Ya tiene imagen propia no compartida',
      });
      continue;
    }

    if (hasOwn && String(p.fm.imagen_provisional) === 'true') {
      decisions.push({
        slug,
        src,
        why,
        decision: 'provisional_propia',
        detail: `Conserva provisional propia ${currentImg}`,
      });
      continue;
    }

    // Compartida: marcar provisional si no lo está + alta prioridad no-sirven
    let fm = p.rawFm;
    if (String(p.fm.imagen_provisional) !== 'true') {
      fm = set(fm, 'imagen_provisional', true);
      writeMd(p.mdPath, fm, p.body);
    }
    decisions.push({
      slug,
      src,
      why,
      brand: p.fm.brand || '',
      model: p.fm.model || p.fm.sku || '',
      power: p.fm.power || '',
      title: p.fm.title || '',
      decision: 'compartida_prioridad_alta',
      detail: 'Sin foto propia; se mantiene compartida + no-sirven prioridad alta',
    });
  }
}

const alta = decisions.filter((d) => d.decision === 'compartida_prioridad_alta');
const propias = decisions.filter((d) => d.decision !== 'compartida_prioridad_alta');

// Append to no-sirven
let noSirve = fs.existsSync(NOSIRVE) ? fs.readFileSync(NOSIRVE, 'utf8') : '';
if (!noSirve.includes('## Prioridad alta — imagen compartida incorrecta (REVISAR)')) {
  noSirve += [
    '',
    '## Prioridad alta — imagen compartida incorrecta (REVISAR)',
    '',
    'Misma foto usada entre modelos/potencias distintos. Conseguir foto oficial por modelo.',
    '',
    '| Prioridad | Marca | Modelo | Potencia | Slug | Fuente compartida | Motivo |',
    '|---|---|---|---|---|---|---|',
    ...alta.map(
      (d) =>
        `| ALTA | ${d.brand} | ${d.model} | ${d.power || '—'} | ${d.slug} | \`${d.src}\` | ${d.why} |`
    ),
    '',
  ].join('\n');
  fs.writeFileSync(NOSIRVE, noSirve);
}

fs.writeFileSync(
  DECISIONES,
  [
    '# Decisiones REVISAR (imágenes compartidas)',
    '',
    `Actualizado: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `- Con foto propia / provisional propia: **${propias.length}**`,
    `- Compartida → prioridad alta en no-sirven: **${alta.length}**`,
    '',
    '| Slug | Decisión | Detalle | Motivo REVISAR |',
    '|---|---|---|---|',
    ...decisions.map(
      (d) => `| ${d.slug} | ${d.decision} | ${d.detail} | ${d.why} |`
    ),
    '',
  ].join('\n')
);

console.log('REVISAR decisiones:', decisions.length, 'alta:', alta.length, 'propias:', propias.length);
console.log('Escrito', path.relative(ROOT, DECISIONES));
