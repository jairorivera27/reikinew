import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const re = /accesorio|dongle|smart dongle|wlan|wifi stick|dtu|ecu-|trunk cable|end cap|optimizer|optimizador|sensor de temperatura|module temperature|battery status|shunt|cable.*huawei|02233/i;

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const fm = raw.split('---')[1] || '';
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  const title = get('title');
  const cat = get('category');
  const draft = /^draft:\s*true/m.test(fm);
  if (!re.test(title) && !re.test(get('model'))) continue;
  if (draft) continue;
  console.log(`${cat.padEnd(13)} ${f.padEnd(40)} ${title.slice(0, 72)}`);
}
