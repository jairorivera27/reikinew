import fs from 'fs';
import path from 'path';

const dir = 'src/content/productos';
let bad = 0;
let total = 0;
const reasons = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  if (/^draft:\s*true/m.test(t)) continue;
  total++;
  const img = (t.match(/^image:\s*"([^"]*)"/m) || [])[1] || '';
  const abs = path.join('public', img.replace(/^\//, ''));
  const isBad =
    !img ||
    /placeholders\//i.test(img) ||
    /logo-Victron|\/huawei\.png$|\/growatt\.png$|\/livoltek\.png$|\/Must\.png$/i.test(img) ||
    !fs.existsSync(abs);
  if (isBad) {
    bad++;
    reasons[img || '(sin image)'] = (reasons[img || '(sin image)'] || 0) + 1;
  }
}
console.log({ total, bad, ok: total - bad });
console.log(reasons);
