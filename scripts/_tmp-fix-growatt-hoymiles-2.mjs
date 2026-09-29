import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inv = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer || url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20000) throw new Error('small ' + buf.length);
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url.slice(0, 120));
  return true;
}

async function grab(page, dest, must) {
  const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
  const urls = [
    ...new Set(
      [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) =>
        m[0].replace(/&amp;/g, '&')
      )
    ),
  ].filter((u) => must.test(u) && !/logo|icon|banner|favicon|rail|homekit|meter|schiene/i.test(u));
  console.log(page, urls.length);
  for (const u of urls.slice(0, 30)) {
    try {
      await download(u, dest, page);
      return true;
    } catch {
      /* next */
    }
  }
  return false;
}

const growattPages = [
  'https://www.growatt.com/products/residential-pv-inverter-min-tl-xh',
  'https://en.growatt.com/products/min-2500-6000tl-xh',
  'https://www.solartraders.com/en/products/inverters/growatt-min-3000tl-xh',
  'https://solux.energy/products/growatt-min-3000tl-xh',
  'https://www.europe-solarstore.com/growatt-min-3000tl-xh.html',
];

for (const name of ['growatt-min.jpg', 'growatt-mod.jpg']) {
  const dest = path.join(inv, name);
  let ok = false;
  for (const p of growattPages) {
    try {
      if (await grab(p, dest, /growatt|min|mod|mid|inverter|product|cdn|upload|media|shopify/i)) {
        ok = true;
        break;
      }
    } catch (e) {
      console.warn(p, e.message);
    }
  }
  if (!ok) console.warn('FAIL', name);
}

const hoyPages = [
  'https://www.solartraders.com/en/products/inverters/hoymiles-hms-800-2t',
  'https://solux.energy/products/hms-800-2t-best-microinverter',
  'https://www.hoymiles.com/products/hms-600-700-800-900-1000-2t.html',
  'https://solaronline.ca/product/hoymiles-hms-800-2t-na/',
];

for (const p of hoyPages) {
  try {
    if (
      await grab(
        p,
        path.join(inv, 'hoymiles-hms.jpg'),
        /hoymiles|hms|micro|cdn|cloudinary|shopify|upload|media|product/i
      )
    )
      break;
  } catch (e) {
    console.warn(p, e.message);
  }
}
