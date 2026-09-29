import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const out = [];

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const fm = fs.readFileSync(path.join(DIR, f), 'utf8').split('---')[1] || '';
  if (/^draft:\s*true/m.test(fm)) continue;
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  const brand = get('brand');
  if (!brand || /^sin marca$/i.test(brand) || /^multimarca$/i.test(brand) || /^gen[eé]rico$/i.test(brand)) {
    out.push({ f, brand: brand || '(vacío)', cat: get('category'), title: get('title').slice(0, 70) });
  }
}

const porCat = {};
for (const p of out) porCat[p.cat] = (porCat[p.cat] || 0) + 1;

console.log('Total sin marca / sin brand:', out.length);
console.log('Por categoría:', porCat);
console.log('\nPrimeros 25:');
for (const p of out.slice(0, 25)) {
  console.log(' ', p.cat.padEnd(13), p.brand.padEnd(12), p.title);
}
