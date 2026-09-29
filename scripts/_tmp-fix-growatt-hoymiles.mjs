import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inv = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*', Referer: referer || url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 18000) throw new Error('small ' + buf.length);
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url.slice(0, 110));
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
  ].filter((u) => !/logo|icon|banner|favicon|payment|rail|schiene|mount/i.test(u));
}

const pages = [
  'https://shop.krannich-solar.com/de-en/search?search=growatt%20min%203000',
  'https://shop.krannich-solar.com/de-en/search?search=growatt%20hybrid',
  'https://shop.krannich-solar.com/de-en/search?search=Growatt%20MIN%20TL-XH',
  'https://www.shop-rebor.com/en/search?q=growatt+min+3000',
  'https://www.shop-rebor.com/en/search?q=growatt+inverter',
  'https://e-catalog.com/GROWATT-MIN-3000TL-XH.htm',
];

for (const name of ['growatt-min.jpg', 'growatt-mod.jpg']) {
  let ok = false;
  for (const p of pages) {
    try {
      const imgs = await imagesFrom(p);
      const ranked = imgs.sort((a, b) => {
        const score = (u) =>
          (/growatt/i.test(u) ? 10 : 0) +
          (/min|mod|mid|inverter|hybrid|xh/i.test(u) ? 8 : 0) +
          (/rail|schiene|mount|clamp/i.test(u) ? -20 : 0);
        return score(b) - score(a);
      });
      console.log(name, p, ranked.length, ranked[0]?.slice(0, 80));
      for (const u of ranked.slice(0, 20)) {
        if (/rail|schiene|mount|clamp|profil/i.test(u)) continue;
        try {
          await download(u, path.join(inv, name), p);
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
  if (!ok) console.warn('FAIL', name);
}

// Hoymiles again via krannich microinverter category-ish search
for (const p of [
  'https://shop.krannich-solar.com/de-en/search?search=HMS-800',
  'https://shop.krannich-solar.com/de-en/search?search=Hoymiles%20HMS',
  'https://www.shop-rebor.com/en/search?q=HMS-800',
]) {
  try {
    const imgs = await imagesFrom(p);
    console.log('hoymiles', p, imgs.length);
    let ok = false;
    for (const u of imgs.slice(0, 25)) {
      if (!/hoymiles|hms|micro/i.test(u) && imgs.length > 3) continue;
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
    console.warn(e.message);
  }
}
