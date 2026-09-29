import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const invDir = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*', Referer: referer || 'https://www.google.com/' },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20000) throw new Error('small ' + buf.length);
  const hex = buf.slice(0, 8).toString('hex');
  if (!/^ffd8ff|^89504e47|^52494646/i.test(hex)) throw new Error('not image');
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length);
}

async function shopifyImages(page) {
  const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
  return [
    ...new Set(
      [...html.matchAll(/https?:\/\/[^"'\\\s>]+(?:cdn\.shopify\.com|shopifycdn)[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
        (m) => m[0].replace(/&amp;/g, '&').replace(/\\u0026/g, '&')
      )
    ),
  ];
}

// Direct known good URLs
const directs = [
  [
    'goodwe-es.jpg',
    'https://s3.eu-central-1.amazonaws.com/krannich-shop/media/image/05/5b/b4/1-4-3-9-1439e299352cfb1a8c04a180fba7833f3fd5ff22_det_ivh_gw_gw3600_6000n_es_g2-jpg_600x600.jpg',
    'https://shop.krannich-solar.com/',
  ],
];

for (const [name, url, ref] of directs) {
  try {
    await download(url, path.join(invDir, name), ref);
  } catch (e) {
    console.warn('direct fail', name, e.message);
  }
}

const pages = [
  ['goodwe-es.jpg', 'https://www.shop-rebor.com/en/products/goodwe-gw5000-es-20-hybride'],
  ['growatt-min.jpg', 'https://www.shop-rebor.com/en/search?q=growatt+min'],
  ['hoymiles-hms.jpg', 'https://www.shop-rebor.com/en/search?q=hoymiles'],
  ['fronius-primo.jpg', 'https://www.shop-rebor.com/en/search?q=fronius+primo'],
  ['goodwe-sdt.jpg', 'https://www.shop-rebor.com/en/search?q=goodwe+sdt'],
  ['growatt-mod.jpg', 'https://www.shop-rebor.com/en/search?q=growatt+mod'],
];

for (const [name, page] of pages) {
  const dest = path.join(invDir, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 40000 && name === 'goodwe-es.jpg') {
    // already got from krannich possibly
    const st = fs.statSync(dest);
    if (st.size > 40000) {
      console.log('have', name, st.size);
      // still try better
    }
  }
  try {
    const imgs = await shopifyImages(page);
    console.log(page, imgs.length);
    let ok = false;
    for (const u of imgs.slice(0, 15)) {
      try {
        await download(u, dest, page);
        ok = true;
        break;
      } catch {
        /* next */
      }
    }
    if (!ok) console.warn('fail page', name);
  } catch (e) {
    console.warn('page err', name, e.message);
  }
}

// Copy goodwe-es to goodwe-sdt if sdt still fallback-sized/same as huawei
const es = path.join(invDir, 'goodwe-es.jpg');
const sdt = path.join(invDir, 'goodwe-sdt.jpg');
if (fs.existsSync(es) && fs.statSync(es).size > 40000) {
  if (!fs.existsSync(sdt) || fs.statSync(sdt).size < 40000) {
    fs.copyFileSync(es, sdt);
    console.log('copy es->sdt');
  }
}

console.log('done');
