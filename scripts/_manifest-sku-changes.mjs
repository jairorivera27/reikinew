/**
 * Lista cambios de match a nivel SKU (mejor fila) + simula home.
 */
import fs from 'node:fs';
import path from 'node:path';

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
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (/^\d+$/.test(v)) v = Number(v);
    out[mm[1]] = v;
  }
  return out;
}

const lines = fs.readFileSync('imagenes-proveedores/manifest.csv', 'utf8').split(/\r?\n/).filter(Boolean);
const headers = splitCsvLine(lines[0]);
const rows = lines.slice(1).map((line) => {
  const cols = splitCsvLine(line);
  const row = {};
  headers.forEach((h, i) => (row[h] = cols[i] ?? ''));
  return row;
});

const rank = (m) => (m === 'exacto' ? 3 : m === 'serie' ? 2 : m === 'dudoso' ? 1 : 0);
const bySku = new Map();
for (const r of rows) {
  if (r.descartado === 'si') continue;
  if (String(r.formato).toLowerCase() === 'pdf') continue;
  const cur = bySku.get(r.sku) || { orig: '', next: '', reasons: [] };
  if (rank(r.match_original) >= rank(cur.orig)) cur.orig = r.match_original || '';
  if (rank(r.match) > rank(cur.next)) {
    cur.next = r.match || '';
    cur.motivo = r.motivo || '';
  }
  bySku.set(r.sku, cur);
}

const changed = [];
for (const [sku, v] of bySku) {
  const o = v.orig || '(vacío)';
  const n = v.next || '(sin match)';
  if (o !== n) changed.push({ sku, orig: o, next: n, motivo: v.motivo || '' });
}
changed.sort((a, b) => a.sku.localeCompare(b.sku));

const exact = [...bySku.values()].filter((v) => v.next === 'exacto').length;
const serie = [...bySku.values()].filter((v) => v.next === 'serie').length;
const dudoso = [...bySku.values()].filter((v) => v.next === 'dudoso').length;

console.log('SKU match counts:', { exacto: exact, serie, dudoso, total: bySku.size });
console.log('SKUs that changed classification:', changed.length);
console.log('\nChanged SKUs:');
for (const c of changed) console.log(`  ${c.orig} → ${c.next} | ${c.sku} | ${c.motivo}`);

// Home simulation: draft rebajados / pinned / PWM
const PROD = 'src/content/productos';
const all = [];
for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md'))) {
  const slug = f.replace(/\.md$/, '');
  all.push({ slug, ...parseFm(fs.readFileSync(path.join(PROD, f), 'utf8')) });
}
const drafts = all.filter((p) => p.draft === true);
const rebajadosDraft = drafts.filter((p) => p.precioAnterior && p.descuentoPct);
const pinnedDraft = drafts.filter((p) => p.homeCarouselOrder != null);
console.log('\nHome safety:');
console.log('  drafts total', drafts.length);
console.log('  rebajados ocultos', rebajadosDraft.length);
console.log('  homeCarouselOrder ocultos', pinnedDraft.length);
const pwm = all.find((p) => p.slug.includes('scc040030020'));
console.log('  PWM 30A draft?', pwm?.draft === true, 'image', pwm?.image);

fs.writeFileSync(
  'docs/manifest-cambios-sku.md',
  [
    '# Cambios de match por SKU (tras reglas de tipo)',
    '',
    `| Match | SKUs |`,
    `|---|---:|`,
    `| exacto | ${exact} |`,
    `| serie | ${serie} |`,
    `| dudoso | ${dudoso} |`,
    '',
    `SKUs con clasificación distinta a la descarga original: **${changed.length}**`,
    '',
    '| SKU | Antes | Después | Motivo |',
    '|---|---|---|---|',
    ...changed.map((c) => `| ${c.sku} | ${c.orig} | ${c.next} | ${c.motivo.replace(/\|/g, '/')} |`),
    '',
  ].join('\n')
);
