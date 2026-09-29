import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'images', 'productos-tienda', 'paneles-solares');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer || 'https://www.google.com/' },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 12000) throw new Error('small ' + buf.length);
  if (/<!DOCTYPE|<html/i.test(buf.slice(0, 120).toString('utf8'))) throw new Error('html');
  fs.writeFileSync(dest, buf);
  return buf.length;
}

const pages = [
  'https://rocksolar.io/products/jam66d45-620w-n-type-bifacial-double-glass-modules',
  'https://aegmarket.com/en/ja-solar/5833-ja-solar-625w-solar-panel-n-type-bifacial-double-glass-module-mb-revamping-2278x1134x30.html',
  'https://autosolar.co/paneles-solares/panel-solar-bifacial-620w-n-type-tensite',
  'https://www.zonsolar.es/inicio/158-panel-solar-must-200w-12v-monocristalino.html',
];

for (const page of pages) {
  try {
    const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
    const imgs = [
      ...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi),
    ]
      .map((m) => m[0])
      .filter((u) => !/logo|icon|banner|sprite|flag|payment|avatar/i.test(u));
    console.log('\nPAGE', page);
    console.log([...new Set(imgs)].slice(0, 12).join('\n'));
  } catch (e) {
    console.log('PAGE FAIL', page, e.message);
  }
}

const tries = [
  [
    'https://rocksolar.io/cdn/shop/files/JA_Solar_JAM66D45_620W.png',
    'ja-from-rocksolar.png',
  ],
  [
    'https://rocksolar.io/cdn/shop/products/jam66d45.jpg',
    'ja-from-rocksolar2.jpg',
  ],
];

for (const [url, name] of tries) {
  try {
    const n = await download(url, path.join(dir, name), 'https://rocksolar.io/');
    console.log('OK', name, n);
  } catch (e) {
    console.log('FAIL', name, e.message);
  }
}
