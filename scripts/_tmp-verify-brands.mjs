import fs from 'fs';
import path from 'path';

const dir = 'src/content/productos';
const want = new Set(['Soluna', 'Huawei', 'Tensite', 'Studer', 'Felicity']);
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  if (/^draft:\s*true/m.test(t)) continue;
  const cat = (t.match(/^category:\s*"?([a-z]+)/m) || [])[1];
  if (cat !== 'inversores' && cat !== 'baterias') continue;
  const brand = (t.match(/^brand:\s*"([^"]*)"/m) || [])[1] || '';
  if (!want.has(brand)) continue;
  const img = (t.match(/^image:\s*"([^"]*)"/m) || [])[1] || '';
  const title = (t.match(/^title:\s*"([^"]*)"/m) || [])[1] || '';
  console.log(brand.padEnd(10), img, '|', title.slice(0, 55));
}
