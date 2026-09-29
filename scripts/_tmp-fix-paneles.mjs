import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'images', 'productos-tienda', 'paneles-solares');

fs.copyFileSync(path.join(dir, 'trinasolar-650w.png'), path.join(dir, 'trina-670w-deg21c.png'));
fs.copyFileSync(path.join(dir, 'ja-solar-595w.png'), path.join(dir, 'ja-solar-625w-bifacial.png'));
fs.copyFileSync(path.join(dir, 'ja-solar-595w.png'), path.join(dir, 'ja-solar-715w-bifacial.png'));
fs.copyFileSync(path.join(dir, 'ja-solar-595w.png'), path.join(dir, 'ja-solar-720w-bifacial.png'));

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function tryDownload(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*', Referer: referer || url },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error('small');
  if (/<!DOCTYPE|<html/i.test(buf.slice(0, 200).toString('utf8'))) throw new Error('html');
  fs.writeFileSync(dest, buf);
  return buf.length;
}

// Search autosolar for JA SKUs product pages
for (const sku of ['1002139', '1002140', '1002142', '3004613']) {
  const html = await (
    await fetch(`https://autosolar.co/busqueda?controller=search&s=${sku}`, {
      headers: { 'User-Agent': UA },
    })
  ).text();
  const links = [...html.matchAll(/href="(\/paneles-solares\/[^"]+)"/g)].map((m) => m[1]);
  const imgs = [...html.matchAll(new RegExp(`cdn\\.autosolar\\.co/images/${sku}/[^\\s\"']+`, 'g'))].map(
    (m) => m[0]
  );
  console.log(sku, 'links', [...new Set(links)].slice(0, 5));
  console.log(sku, 'imgs', [...new Set(imgs)].slice(0, 5));
}

// Try known JA DeepBlue product photo hosts
const candidates = [
  [
    'https://www.jasolar.com/uploadfile/2023/12/12/20231212164002165.jpg',
    path.join(dir, 'ja-deepblue-ref.jpg'),
  ],
  [
    'https://static.trinasolar.com/sites/default/files/styles/product_hero/public/Vertex_S_modules.jpg',
    path.join(dir, 'trina-ref.jpg'),
  ],
];
for (const [url, dest] of candidates) {
  try {
    const n = await tryDownload(url, dest, 'https://www.jasolar.com/');
    console.log('DL', dest, n, url);
  } catch (e) {
    console.log('skip', url, e.message);
  }
}

console.log('files', fs.readdirSync(dir));
