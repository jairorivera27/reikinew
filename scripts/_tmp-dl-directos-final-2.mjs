import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inv = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const bat = path.join(root, 'public', 'images', 'productos-tienda', 'baterias');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer, min = 12000) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer || url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < min) throw new Error('small ' + buf.length);
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url.slice(0, 120));
  return true;
}

// Huawei LUNA battery module (allow smaller)
await download(
  'https://cdn.shop.krannich-solar.com/media/81/7f/48/1750077938/0133893_0_5_a_9_05a96fa758d5bc05d0602f2b44316be8bd04ca09_det_bp_hu_luna2000_5kwh_battery_module__002_.png.png',
  path.join(bat, 'huawei-luna.jpg'),
  'https://shop.krannich-solar.com/',
  10000
);

// Felicity inverter webps from official gallery
const felicityUrls = [
  'https://latam.felicitysolar.com/wp-content/uploads/2024/07/1599722876127297538.webp',
  'https://latam.felicitysolar.com/wp-content/uploads/2024/07/1599723046213947393.webp',
  'https://latam.felicitysolar.com/wp-content/uploads/2024/07/1599722879684075522.webp',
];
for (const u of felicityUrls) {
  try {
    await download(u, path.join(inv, 'felicity-hybrid.webp'), 'https://eu.felicitysolar.com/', 5000);
    // also copy as jpg extension won't decode; keep webp and point products to webp
    fs.copyFileSync(
      path.join(inv, 'felicity-hybrid.webp'),
      path.join(inv, 'felicity-hybrid.jpg')
    );
    break;
  } catch (e) {
    console.warn('felicity', e.message);
  }
}

// Studer: search krannich for xtm and pick largest non-pictos
{
  const page = 'https://shop.krannich-solar.com/de-en/search?search=Studer%20XTM';
  const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
  const urls = [
    ...new Set(
      [...html.matchAll(/https?:\/\/cdn\.shop\.krannich-solar\.com\/media\/[^"'\\\s>]+/gi)].map(
        (m) => m[0]
      )
    ),
  ].filter((u) => /studer|xtender|xtm/i.test(u) && !/pictos|icon|logo/i.test(u));
  console.log('studer urls', urls.slice(0, 8));
  for (const u of urls) {
    try {
      await download(u, path.join(inv, 'studer-xtender.jpg'), page, 15000);
      break;
    } catch (e) {
      console.warn(e.message);
    }
  }
}

// Tensite inverter: search for cargador/inversor tensite product pages on autosolar
{
  const queries = [
    'https://autosolar.co/busqueda?controller=search&s=inversor+cargador+tensite',
    'https://autosolar.co/busqueda?controller=search&s=tensite+48v+6500',
    'https://autosolar.co/busqueda?controller=search&s=IVEM+tensite',
  ];
  let ok = false;
  for (const q of queries) {
    const html = await (await fetch(q, { headers: { 'User-Agent': UA } })).text();
    const urls = [
      ...new Set(
        [...html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/\d+\/[^"'\\\s>]+/gi)].map((m) =>
          m[0]
        )
      ),
    ].filter((u) => /inversor|tensite|cargador|6500|off-grid/i.test(u) && !/panel|kit-|banner/i.test(u));
    console.log('tensite', q, urls.slice(0, 6));
    for (const u of urls) {
      const full = u.replace('-thumb2x', '').replace('-thumb', '');
      try {
        await download(full, path.join(inv, 'tensite-inverter.jpg'), q, 20000);
        ok = true;
        break;
      } catch {
        try {
          await download(u, path.join(inv, 'tensite-inverter.jpg'), q, 15000);
          ok = true;
          break;
        } catch {
          /* next */
        }
      }
    }
    if (ok) break;
  }
  if (!ok) {
    // Use Must hybrid-looking inverter as temporary Tensite off-grid family photo
    // Prefer deye hybrid which is off-grid/hybrid style
    fs.copyFileSync(path.join(inv, 'deye-hybrid.png'), path.join(inv, 'tensite-inverter.jpg'));
    console.log('FALLBACK tensite <- deye');
  }
}

console.log('sizes', {
  huawei: fs.statSync(path.join(bat, 'huawei-luna.jpg')).size,
  soluna: fs.statSync(path.join(bat, 'soluna-battery.jpg')).size,
  studer: fs.statSync(path.join(inv, 'studer-xtender.jpg')).size,
  felicity: fs.statSync(path.join(inv, 'felicity-hybrid.jpg')).size,
  tensite: fs.statSync(path.join(inv, 'tensite-inverter.jpg')).size,
});
