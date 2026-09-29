import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const oldPath = 'public/images/productos-estudio/victron-scc900300000-n-a.webp';
const tmp = oldPath + '.tmp.webp';
const newName = 'victron-bluesolar-mono-scc900300000';
const newPath = `public/images/productos-estudio/${newName}.webp`;
const thumbPath = `public/images/productos-estudio/${newName}-thumb.webp`;
const input = fs.existsSync(tmp) ? tmp : oldPath;

let q = 82;
let buf = await sharp(input).webp({ quality: q, effort: 6 }).toBuffer();
while (buf.length / 1024 > 150 && q > 68) {
  q -= 2;
  buf = await sharp(input).webp({ quality: q, effort: 6 }).toBuffer();
}
fs.writeFileSync(newPath, buf);
await sharp(input).resize(600, 600, { fit: 'fill' }).webp({ quality: 84 }).toFile(thumbPath);
console.log('wrote', newPath, (buf.length / 1024).toFixed(1) + 'KB q' + q);

const dir = 'src/content/productos';
let n = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
  const p = path.join(dir, f);
  let raw = fs.readFileSync(p, 'utf8');
  if (!raw.includes('victron-scc900300000-n-a')) continue;
  raw = raw.replaceAll(
    '/images/productos-estudio/victron-scc900300000-n-a.webp',
    `/images/productos-estudio/${newName}.webp`
  );
  raw = raw.replaceAll(
    '/images/productos-estudio/victron-scc900300000-n-a-thumb.webp',
    `/images/productos-estudio/${newName}-thumb.webp`
  );
  fs.writeFileSync(p, raw);
  n++;
}
console.log('updated md', n);
