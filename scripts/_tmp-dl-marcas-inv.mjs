import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const invDir = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*', Referer: referer || url },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20000) throw new Error('small ' + buf.length);
  const hex = buf.slice(0, 8).toString('hex');
  if (!/^ffd8ff|^89504e47|^52494646/i.test(hex)) throw new Error('not image');
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url.slice(0, 100));
}

async function fromPage(page, dest, filter) {
  const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
  const urls = [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) =>
    m[0].replace(/&amp;/g, '&')
  );
  const list = [...new Set(urls)].filter(
    (u) => filter.test(u) && !/logo|icon|banner|sprite|favicon|thumb|small|payment/i.test(u)
  );
  console.log(page, '->', list.length);
  for (const u of list.slice(0, 25)) {
    try {
      await download(u, dest, page);
      return true;
    } catch {
      /* next */
    }
  }
  return false;
}

// More distributor sources
const jobs = [
  [
    path.join(invDir, 'goodwe-es.jpg'),
    [
      'https://www.solaris-shop.com/goodwe-gw5000-es-20-hybrid-inverter/',
      'https://www.europe-solarstore.com/goodwe-gw5000-es-20.html',
      'https://shop.solar-distribution.eu/goodwe-gw5000-es-20',
    ],
    /goodwe|gw5000|media|catalog|product|upload/i,
  ],
  [
    path.join(invDir, 'growatt-min.jpg'),
    [
      'https://www.solaris-shop.com/growatt-min-3000tl-xh-hybrid-inverter/',
      'https://www.europe-solarstore.com/growatt-min-3000tl-xh-us.html',
    ],
    /growatt|min|media|catalog|product|upload/i,
  ],
  [
    path.join(invDir, 'hoymiles-hms.jpg'),
    [
      'https://www.solaris-shop.com/hoymiles-hms-800w-2t-microinverter/',
      'https://www.europe-solarstore.com/hoymiles-hms-800.html',
    ],
    /hoymiles|hms|media|catalog|product|upload/i,
  ],
  [
    path.join(invDir, 'fronius-primo.jpg'),
    [
      'https://www.solaris-shop.com/fronius-primo-3-8-1-208-240-inverter/',
      'https://www.europe-solarstore.com/fronius-primo-4-0-1.html',
    ],
    /fronius|primo|media|catalog|product|upload/i,
  ],
  [
    path.join(invDir, 'goodwe-sdt.jpg'),
    ['https://www.solaris-shop.com/goodwe-gw10k-dt-grid-tie-inverter/'],
    /goodwe|sdt|dt|media|catalog|product/i,
  ],
];

for (const [dest, pages, re] of jobs) {
  // overwrite fallbacks with real brand images when possible
  let ok = false;
  for (const p of pages) {
    try {
      if (await fromPage(p, dest, re)) {
        ok = true;
        break;
      }
    } catch (e) {
      console.warn(p, e.message);
    }
  }
  if (!ok) console.warn('still fail', path.basename(dest));
}
