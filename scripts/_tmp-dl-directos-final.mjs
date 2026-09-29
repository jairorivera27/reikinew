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
  if (buf.length < 20000) throw new Error('small ' + buf.length);
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length);
  return true;
}

const directs = [
  [
    path.join(bat, 'huawei-luna.jpg'),
    [
      'https://cdn.shop.krannich-solar.com/media/81/7f/48/1750077938/0133893_0_5_a_9_05a96fa758d5bc05d0602f2b44316be8bd04ca09_det_bp_hu_luna2000_5kwh_battery_module__002_.png.png',
      'https://cdn.shop.krannich-solar.com/media/81/7f/48/1750077938/0133893_0_5_a_9_05a96fa758d5bc05d0602f2b44316be8bd04ca09_det_bp_hu_luna2000_5kwh_battery_module__002_.png',
    ],
    'https://shop.krannich-solar.com/',
  ],
  [
    path.join(bat, 'soluna-battery.jpg'),
    [
      'https://www.renvu.com/cdn/shop/files/media_ba49c6a9-1c95-4c3e-8a95-ab9c4b80bffe.png',
      'https://cdn.shopify.com/s/files/1/0558/0879/8095/files/media_ba49c6a9-1c95-4c3e-8a95-ab9c4b80bffe.png',
    ],
    'https://www.renvu.com/',
  ],
  [
    path.join(inv, 'studer-xtender.jpg'),
    [
      'https://cdn.shop.krannich-solar.com/media/f7/10/55/1750077566/0121997_0_9_0_2_09025cda5fa5b3752dc11970112885e3f01aa3a8_det_aca_be_studer_xtender.jpg',
      'https://cdn.shop.krannich-solar.com/media/f7/10/55/1750077566/0121997_0_9_0_2_09025cda5fa5b3752dc11970112885e3f01aa3a8_det_aca_be_',
    ],
    'https://shop.krannich-solar.com/',
  ],
];

for (const [dest, urls, ref] of directs) {
  let ok = false;
  for (const u of urls) {
    try {
      await download(u, dest, ref);
      ok = true;
      break;
    } catch (e) {
      console.warn(path.basename(dest), e.message, u.slice(0, 100));
    }
  }
  if (!ok) console.warn('FAIL', path.basename(dest));
}

// Scrape self2solar soluna for better image
{
  const page =
    'https://www.self2solar.com/products/soluna-battery-module-10k-15k-pack-hv-10-15kwh-268-8-384v-ul1973-ul9540a';
  try {
    const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
    const urls = [
      ...new Set(
        [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0])
      ),
    ].filter((u) => /cdn\.shopify\.com.*?(soluna|10k|pack|battery|files)/i.test(u));
    console.log('self2solar', urls.slice(0, 10));
    for (const u of urls) {
      try {
        await download(u, path.join(bat, 'soluna-battery.jpg'), page);
        break;
      } catch {
        /* next */
      }
    }
  } catch (e) {
    console.warn('self2solar', e.message);
  }
}

// Felicity: scrape product listing more carefully for IVEM product image from wp uploads that aren't marketing
{
  const page = 'https://eu.felicitysolar.com/product/ivem5048/';
  try {
    const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
    // woocommerce gallery
    const urls = [
      ...html.matchAll(
        /(?:data-large_image|data-src|src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi
      ),
    ].map((m) => m[1]);
    console.log('felicity gallery', [...new Set(urls)].slice(0, 15));
    for (const u of [...new Set(urls)]) {
      if (/casas-para|cargador|EMPRESAS|bodega|panda|logo|banner|cropped/i.test(u)) continue;
      try {
        await download(u, path.join(inv, 'felicity-hybrid.jpg'), page);
        break;
      } catch {
        /* next */
      }
    }
  } catch (e) {
    console.warn('felicity', e.message);
  }
}

// Tensite: extract from kit page but crop isn't possible; try product 3004117 on autosolar by searching HTML for product card image with tensite in alt
{
  const page = 'https://autosolar.co/busqueda?controller=search&s=tensite+6500w';
  const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
  const cards = [
    ...html.matchAll(
      /cdn\.autosolar\.co\/images\/(\d+)\/([^"'\\\s>]+)/gi
    ),
  ];
  const bySku = {};
  for (const m of cards) {
    const sku = m[1];
    const file = m[0];
    if (!bySku[sku]) bySku[sku] = [];
    bySku[sku].push('https://' + file.replace(/^https?:\/\//, ''));
  }
  // Prefer SKUs whose filenames mention tensite/inversor and not kit
  let best = null;
  for (const [sku, list] of Object.entries(bySku)) {
    const joined = list.join(' ').toLowerCase();
    if (/kit-/.test(joined)) continue;
    if (/tensite|inversor|6500|off-grid/.test(joined)) {
      best = list.find((u) => !/thumb/.test(u)) || list[0];
      console.log('tensite candidate sku', sku, best);
      break;
    }
  }
  if (best) {
    try {
      await download(best.replace('-thumb2x', '').replace('-thumb', ''), path.join(inv, 'tensite-inverter.jpg'), page);
    } catch (e) {
      console.warn('tensite', e.message);
    }
  } else {
    console.warn('no tensite sku image; listing skus', Object.keys(bySku).slice(0, 15));
  }
}
