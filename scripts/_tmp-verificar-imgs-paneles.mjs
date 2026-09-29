import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1) Re-audit active panels
const prodDir = path.join(root, 'src', 'content', 'productos');
const active = [];
for (const f of fs.readdirSync(prodDir).filter((x) => x.endsWith('.md'))) {
  const text = fs.readFileSync(path.join(prodDir, f), 'utf8');
  if (!/^category:\s*["']?paneles/m.test(text)) continue;
  if (/^draft:\s*true/m.test(text)) continue;
  const image = (text.match(/^image:\s*"([^"]+)/m) || [])[1] || '';
  const abs = path.join(root, 'public', image.replace(/^\//, ''));
  const exists = fs.existsSync(abs);
  const size = exists ? fs.statSync(abs).size : 0;
  let kind = 'missing';
  if (exists) {
    const buf = fs.readFileSync(abs);
    const hex = buf.slice(0, 8).toString('hex');
    if (/^ffd8ff/i.test(hex)) kind = 'jpeg';
    else if (/^89504e47/i.test(hex)) kind = 'png';
    else if (image.endsWith('.svg') || /<svg/i.test(buf.slice(0, 60).toString('utf8'))) kind = 'svg';
    else kind = 'other';
  }
  const bad =
    !exists ||
    size < 3000 ||
    kind === 'svg' ||
    kind === 'missing' ||
    /placeholder/i.test(image);
  active.push({
    slug: f.replace(/\.md$/, ''),
    image,
    exists,
    size,
    kind,
    bad,
  });
}

console.log('ACTIVE', active.length);
console.log('BAD', active.filter((a) => a.bad).length);
for (const a of active.filter((a) => a.bad)) console.log(' BAD', a);
for (const a of active.filter((a) => !a.bad)) console.log(' OK', a.slug, a.kind, a.size);

// 2) Verify built category HTML image refs resolve in public/ and dist/
const htmlPath = path.join(root, 'dist', 'tienda', 'categoria', 'paneles-solares', 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const imgs = [...html.matchAll(/src="(\/images\/[^"]+)"/g)].map((m) => m[1]);
  const unique = [...new Set(imgs)];
  console.log('\nDIST category image refs:', unique.length);
  let broken = 0;
  for (const src of unique) {
    const pub = path.join(root, 'public', src.replace(/^\//, ''));
    const dist = path.join(root, 'dist', src.replace(/^\//, ''));
    const okPub = fs.existsSync(pub);
    const okDist = fs.existsSync(dist);
    if (!okPub || !okDist) {
      broken++;
      console.log(' BROKEN', src, { okPub, okDist });
    }
  }
  console.log('Broken refs:', broken);
} else {
  console.log('No dist category page yet');
}
