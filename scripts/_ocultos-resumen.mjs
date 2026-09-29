/**
 * Resume qué productos de home (destacados/descuentos) están draft.
 * También resumen de todos los draft por categoría/marca.
 */
import fs from 'node:fs';
import path from 'node:path';

const PROD = 'src/content/productos';

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

const all = [];
for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md'))) {
  const slug = f.replace(/\.md$/, '');
  const fm = parseFm(fs.readFileSync(path.join(PROD, f), 'utf8'));
  all.push({ slug, ...fm });
}

const drafts = all.filter((p) => p.draft === true);
const active = all.filter((p) => p.draft !== true);
const rebajados = active.filter((p) => p.precioAnterior && p.descuentoPct);
const rebajadosDraft = all.filter((p) => p.draft === true && p.precioAnterior && p.descuentoPct);
const pinned = all.filter((p) => p.homeCarouselOrder != null);
const pinnedDraft = pinned.filter((p) => p.draft === true);

console.log('=== HOME / DESCUENTOS ocultos ===');
console.log('homeCarouselOrder ocultos:', pinnedDraft.length);
for (const p of pinnedDraft) console.log(' PIN', p.homeCarouselOrder, p.slug, p.brand, p.title);
console.log('descuentos ocultos:', rebajadosDraft.length);
for (const p of rebajadosDraft) console.log(' DESC', p.descuentoPct + '%', p.slug, p.brand);

console.log('\n=== DRAFTS', drafts.length, '===');
const byCat = {};
const byBrand = {};
const byCatBrand = {};
for (const p of drafts) {
  const cat = p.category || '?';
  const brand = p.brand || 'Sin marca';
  byCat[cat] = (byCat[cat] || 0) + 1;
  byBrand[brand] = (byBrand[brand] || 0) + 1;
  const k = cat + '|' + brand;
  byCatBrand[k] = (byCatBrand[k] || 0) + 1;
}
console.log('\nPor categoría:');
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) console.log(v, k);
console.log('\nPor marca:');
for (const [k, v] of Object.entries(byBrand).sort((a, b) => b[1] - a[1])) console.log(v, k);
console.log('\nPor categoría × marca:');
for (const [k, v] of Object.entries(byCatBrand).sort((a, b) => b[1] - a[1])) {
  const [cat, brand] = k.split('|');
  console.log(v, cat, '·', brand);
}

fs.writeFileSync(
  'docs/ocultos-resumen.md',
  [
    '# Productos ocultos (draft)',
    '',
    `Total: **${drafts.length}**`,
    '',
    '## Por categoría',
    '',
    '| Categoría | SKUs |',
    '|---|---:|',
    ...Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '## Por marca',
    '',
    '| Marca | SKUs |',
    '|---|---:|',
    ...Object.entries(byBrand)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '## Por categoría × marca',
    '',
    '| Categoría | Marca | SKUs |',
    '|---|---|---:|',
    ...Object.entries(byCatBrand)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => {
        const [cat, brand] = k.split('|');
        return `| ${cat} | ${brand} | ${v} |`;
      }),
    '',
  ].join('\n')
);
console.log('\nWrote docs/ocultos-resumen.md');
