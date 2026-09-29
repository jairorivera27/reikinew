import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const invDir = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer || url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 15000) throw new Error('small ' + buf.length);
  const hex = buf.slice(0, 8).toString('hex');
  if (!/^ffd8ff|^89504e47|^52494646/i.test(hex)) throw new Error('not image');
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url.slice(0, 120));
  return true;
}

async function imagesFrom(page) {
  const res = await fetch(page, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const html = await res.text();
  const urls = [
    ...html.matchAll(/https?:\\\/\\\/[^"'\\\s>]+/g),
    ...html.matchAll(/https?:\/\/[^"'\\\s>]+/g),
  ].flatMap((m) => [m[0].replace(/\\\//g, '/')]);
  return [
    ...new Set(
      urls
        .map((u) => u.replace(/&amp;/g, '&').split('?')[0])
        .filter((u) => /\.(jpg|jpeg|png|webp)$/i.test(u))
        .filter((u) => !/logo|icon|banner|sprite|favicon|payment|flag/i.test(u))
    ),
  ];
}

const jobs = [
  {
    file: 'goodwe-es.jpg',
    pages: [
      'https://shop.krannich-solar.com/de-en/inverters/hybrid-inverters/64757/gw5000-es-20-g2',
      'https://www.shop-rebor.com/en/products/goodwe-gw5000-es-20-hybride',
      'https://e-catalog.com/GOODWE-ES-G2-SERIES-GW5000-ES-20.htm',
    ],
    prefer: /goodwe|gw5000|es_g2|ivh_gw|product|media|catalog|cdn/i,
  },
  {
    file: 'growatt-min.jpg',
    pages: [
      'https://shop.krannich-solar.com/de-en/search?search=growatt%20min',
      'https://e-catalog.com/list/234/',
    ],
    prefer: /growatt|min|product|media|catalog|cdn/i,
  },
  {
    file: 'hoymiles-hms.jpg',
    pages: [
      'https://shop.krannich-solar.com/de-en/search?search=hoymiles%20hms',
      'https://www.hoymiles.com/products/microinverter/hms-series/',
    ],
    prefer: /hoymiles|hms|product|media|upload|cdn/i,
  },
  {
    file: 'fronius-primo.jpg',
    pages: [
      'https://shop.krannich-solar.com/de-en/search?search=fronius%20primo',
      'https://www.fronius.com/en/solar-energy/installers-partners/products-solutions/residential-solutions/fronius-primo',
    ],
    prefer: /fronius|primo|media|upload|cdn|product/i,
  },
  {
    file: 'goodwe-sdt.jpg',
    pages: [
      'https://shop.krannich-solar.com/de-en/search?search=goodwe%20sdt',
    ],
    prefer: /goodwe|sdt|media|cdn|product/i,
  },
  {
    file: 'growatt-mod.jpg',
    pages: ['https://shop.krannich-solar.com/de-en/search?search=growatt%20mod'],
    prefer: /growatt|mod|mid|media|cdn|product/i,
  },
];

for (const job of jobs) {
  const dest = path.join(invDir, job.file);
  let ok = false;
  for (const page of job.pages) {
    try {
      const imgs = (await imagesFrom(page)).filter((u) => job.prefer.test(u));
      console.log(job.file, page, 'cands', imgs.length);
      // also try all images if prefer too strict
      const list = imgs.length ? imgs : await imagesFrom(page);
      for (const u of list.slice(0, 30)) {
        if (!job.prefer.test(u) && imgs.length) continue;
        try {
          await download(u, dest, page);
          ok = true;
          break;
        } catch (e) {
          // continue
        }
      }
      if (ok) break;
    } catch (e) {
      console.warn('err', job.file, page, e.message);
    }
  }
  if (!ok) console.warn('FAIL', job.file);
}

// If goodwe-es succeeded, mirror to sdt when sdt still equals huawei hash
console.log('done');
