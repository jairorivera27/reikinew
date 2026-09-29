import fs from 'fs';
import path from 'path';

const dir = 'src/content/productos';
const brands = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  if (/^draft:\s*true/m.test(t)) continue;
  const brand = (t.match(/^brand:\s*"([^"]*)"/m) || [])[1] || 'Sin marca';
  brands.set(brand, (brands.get(brand) || 0) + 1);
}
[...brands.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([b, n]) => console.log(String(n).padStart(3), b));
