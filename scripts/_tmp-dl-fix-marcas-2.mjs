import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inv = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const bat = path.join(root, 'public', 'images', 'productos-tienda', 'baterias');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer || url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 25000) throw new Error('small ' + buf.length);
  const hex = buf.slice(0, 8).toString('hex');
  if (!/^ffd8ff|^89504e47|^52494646/i.test(hex)) throw new Error('not image');
  // reject common junk
  if (/promo|banner|campana|untitled|logo|casas-para-web|cat-inversore/i.test(url)) {
    throw new Error('junk url');
  }
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url.slice(0, 120));
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
  ].filter(
    (u) =>
      !/logo|icon|banner|favicon|payment|sprite|emoji|promo|campana|untitled|casas-para|cat-inversore|stars-review/i.test(
        u
      )
  );
}

async function tryPages(dest, pages, prefer) {
  for (const page of pages) {
    try {
      const imgs = (await imagesFrom(page)).filter((u) => prefer.test(u));
      console.log(path.basename(dest), page, imgs.length);
      for (const u of imgs.slice(0, 30)) {
        try {
          await download(u, dest, page);
          return true;
        } catch (e) {
          // continue
        }
      }
    } catch (e) {
      console.warn(page, e.message);
    }
  }
  return false;
}

// Delete bad ones first
for (const p of [
  path.join(inv, 'tensite-inverter.jpg'),
  path.join(inv, 'felicity-hybrid.jpg'),
  path.join(bat, 'soluna-battery.jpg'),
]) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

const jobs = [
  [
    path.join(bat, 'soluna-battery.jpg'),
    [
      'https://www.renvu.com/products/soluna-10kwh-hv-lfp-battery',
      'https://www.self2solar.com/products/soluna-battery-module-10k-15k-pack-hv-10-15kwh-268-8-384v-ul1973-ul9540a',
      'https://soluna.co/',
      'https://elalmacenfotovoltaico.com/es/bateria-soluna-10k-pack-hv',
    ],
    /soluna|10k|15k|pack|battery|cdn|shopify|files|product|media/i,
  ],
  [
    path.join(inv, 'studer-xtender.jpg'),
    [
      'https://studer-innotec.com/downloads/',
      'https://studer-innotec.com/en/products/xtender/',
      'https://www.midsummerwholesale.co.uk/buy/studer-xtender-xtm-2600-48',
      'https://www.europe-solarstore.com/studer-xtender-xtm-2600-48.html',
    ],
    /xtender|xtm|studer|product|upload|media|cdn|wp-content/i,
  ],
  [
    path.join(inv, 'felicity-hybrid.jpg'),
    [
      'https://eu.felicitysolar.com/product-category/inverter/',
      'https://us.felicitysolar.com/product-category/inverter/',
      'https://7sun.eu/produkt/?s=felicity+hybrid',
      'https://autosolar.co/busqueda?controller=search&s=IVEM3048',
      'https://autosolar.co/busqueda?controller=search&s=felicity+ivem',
    ],
    /felicity|ivem|ivcm|hybrid|inverter|inversor|wp-content|cdn\.autosolar/i,
  ],
  [
    path.join(inv, 'tensite-inverter.jpg'),
    [
      'https://autosolar.co/busqueda?controller=search&s=inversor+off-grid+tensite+6.5',
      'https://autosolar.co/busqueda?controller=search&s=3004117+tensite',
      'https://autosolar.es/busqueda?controller=search&s=tensite+inversor',
    ],
    /tensite|3004117|inversor|cdn\.autosolar\.co\/images\/\d+\//i,
  ],
  [
    path.join(bat, 'huawei-luna.jpg'),
    [
      'https://www.europe-solarstore.com/huawei-luna2000-5-e0.html',
      'https://www.europe-solarstore.com/huawei-luna2000-7-e1.html',
      'https://shop.krannich-solar.com/de-en/search?search=LUNA2000-5',
      'https://solar.huawei.com/eu/products/Residential/Energy-Storage/LUNA2000',
    ],
    /luna2000|luna|battery|storage|cdn|media|asset|product/i,
  ],
];

for (const [dest, pages, prefer] of jobs) {
  const ok = await tryPages(dest, pages, prefer);
  if (!ok) console.warn('FAIL', path.basename(dest));
}

// Fallbacks if needed: keep previous good studer from krannich if current missing
console.log('files:');
for (const f of [
  'tensite-inverter.jpg',
  'studer-xtender.jpg',
  'felicity-hybrid.jpg',
  'huawei-luna.jpg',
  'soluna-battery.jpg',
]) {
  const p = f.includes('luna') || f.includes('soluna') ? path.join(bat, f) : path.join(inv, f);
  console.log(f, fs.existsSync(p) ? fs.statSync(p).size : 'MISSING');
}
