import fs from 'fs';

const html = fs.readFileSync('dist/index.html', 'utf8');
const sec = html.split('id="productos"')[1] ?? '';
const cards = [...sec.matchAll(/href="\/tienda\/([^"#]+)"[^>]*class="producto-card"/g)].map(
  (m) => m[1]
);
const uniq = [...new Set(cards)];
console.log('tarjetas:', cards.length, '| unicos:', uniq.length);
uniq.forEach((s, i) => console.log(i + 1, s));
console.log('badge -%:', (sec.match(/producto-badge-descuento/g) || []).length);
console.log('badge calidad-precio:', (sec.match(/producto-badge-valor/g) || []).length);
console.log('precio anterior:', (sec.match(/producto-price-anterior/g) || []).length);
