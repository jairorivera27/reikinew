/**
 * Genera data/whatsapp-product-index.json desde src/content/productos/*.md
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src', 'content', 'productos');
const outPath = path.join(process.cwd(), 'data', 'whatsapp-product-index.json');

function getScalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!m) return '';
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function getList(fm, key) {
  const re = new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+(?:\\n|$))+)`, 'm');
  const m = fm.match(re);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((line) => line.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
const out = [];

for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!raw.startsWith('---')) continue;
  const end = raw.indexOf('\n---', 3);
  if (end < 0) continue;
  const fm = raw.slice(3, end);
  const stock = getScalar(fm, 'stock').toLowerCase();
  if (stock.includes('oculto') || stock.includes('hidden')) continue;
  const title = getScalar(fm, 'title');
  if (!title) continue;
  out.push({
    slug: f.replace(/\.md$/, ''),
    title,
    price: getScalar(fm, 'price'),
    sku: getScalar(fm, 'sku'),
    image: getScalar(fm, 'image'),
    brand: getScalar(fm, 'brand'),
    category: getScalar(fm, 'category'),
    power: getScalar(fm, 'power'),
    model: getScalar(fm, 'model'),
    specifications: getList(fm, 'specifications'),
    stock: getScalar(fm, 'stock') || 'disponible',
  });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`[whatsapp-index] ${out.length} productos → ${outPath}`);
