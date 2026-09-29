import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inv = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const bat = path.join(root, 'public', 'images', 'productos-tienda', 'baterias');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function hash(p) {
  return createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 12);
}

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*', Referer: referer || url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20000) throw new Error('small ' + buf.length);
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length);
  return true;
}

async function imagesFrom(page) {
  const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
  return [
    ...new Set(
      [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) =>
        m[0].replace(/&amp;/g, '&')
      )
    ),
  ].filter((u) => !/logo|icon|banner|favicon|payment/i.test(u));
}

for (const p of [
  'https://shop.krannich-solar.com/de-en/search?search=hoymiles',
  'https://www.shop-rebor.com/en/products/hoymiles-hms-800-2t',
  'https://www.shop-rebor.com/en/search?q=hoymiles',
]) {
  try {
    const imgs = await imagesFrom(p);
    console.log(p, imgs.length);
    let ok = false;
    for (const u of imgs.slice(0, 25)) {
      try {
        await download(u, path.join(inv, 'hoymiles-hms.jpg'), p);
        ok = true;
        break;
      } catch {
        /* next */
      }
    }
    if (ok) break;
  } catch (e) {
    console.warn(p, e.message);
  }
}

const sdt = path.join(inv, 'goodwe-sdt.jpg');
const es = path.join(inv, 'goodwe-es.jpg');
if (fs.existsSync(sdt) && fs.statSync(sdt).size < 40000 && fs.existsSync(es)) {
  fs.copyFileSync(es, sdt);
  console.log('copied es->sdt');
}

const files = [
  'huawei-sun2000.png',
  'goodwe-es.jpg',
  'goodwe-sdt.jpg',
  'growatt-min.jpg',
  'growatt-mod.jpg',
  'fronius-primo.jpg',
  'hoymiles-hms.jpg',
  'must-pv.png',
  'apsystems-ds3.png',
  'victron-quattro.png',
  'deye-hybrid.png',
];
for (const f of files) {
  const p = path.join(inv, f);
  if (fs.existsSync(p)) console.log(f, hash(p), fs.statSync(p).size);
}

// sync dist
for (const [src, dst] of [
  [inv, path.join(root, 'dist/images/productos-tienda/inversores')],
  [bat, path.join(root, 'dist/images/productos-tienda/baterias')],
]) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, f), path.join(dst, f));
  }
}
console.log('synced');
