import fs from 'node:fs';
import path from 'node:path';

const dir = 'src/content/productos';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
const out = [];

function get(fm, k) {
  const m = fm.match(new RegExp(`^${k}:\\s*["']?([^"'\\n]+)`, 'm'));
  return m ? m[1].trim() : '';
}

for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!raw.startsWith('---')) continue;
  const end = raw.indexOf('\n---', 3);
  if (end < 0) continue;
  const fm = raw.slice(3, end);
  const stock = get(fm, 'stock').toLowerCase();
  if (stock.includes('oculto') || stock.includes('hidden')) continue;
  const title = get(fm, 'title');
  if (!title) continue;
  out.push({
    slug: f.replace(/\.md$/, ''),
    title,
    category: get(fm, 'category'),
    brand: get(fm, 'brand'),
    price: get(fm, 'price'),
    model: get(fm, 'model'),
  });
}

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/whatsapp-product-index.json', JSON.stringify(out));
console.log('products', out.length);
