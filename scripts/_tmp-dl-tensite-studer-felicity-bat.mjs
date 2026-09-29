import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inv = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const bat = path.join(root, 'public', 'images', 'productos-tienda', 'baterias');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

fs.mkdirSync(inv, { recursive: true });
fs.mkdirSync(bat, { recursive: true });

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer || url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20000) throw new Error('small ' + buf.length);
  const hex = buf.slice(0, 8).toString('hex');
  if (!/^ffd8ff|^89504e47|^52494646/i.test(hex)) throw new Error('not image');
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
  ].filter((u) => !/logo|icon|banner|favicon|payment|sprite|emoji|avatar|wp-include/i.test(u));
}

async function grab(dest, pages, prefer) {
  for (const page of pages) {
    try {
      const imgs = await imagesFrom(page);
      const ranked = imgs.sort((a, b) => {
        const score = (u) => (prefer.test(u) ? 20 : 0) + (/cdn|media|upload|product|shop|files/i.test(u) ? 5 : 0);
        return score(b) - score(a);
      });
      console.log(path.basename(dest), page, 'cands', ranked.filter((u) => prefer.test(u)).length);
      for (const u of ranked.slice(0, 25)) {
        if (!prefer.test(u) && ranked.some((x) => prefer.test(x))) continue;
        try {
          await download(u, dest, page);
          return true;
        } catch {
          /* next */
        }
      }
    } catch (e) {
      console.warn(page, e.message);
    }
  }
  return false;
}

const jobs = [
  {
    dest: path.join(inv, 'tensite-inverter.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=3004117',
      'https://autosolar.co/busqueda?controller=search&s=inversor+tensite+6.5',
      'https://autosolar.co/inversores-solares',
    ],
    prefer: /tensite|3004117|inversor/i,
  },
  {
    dest: path.join(inv, 'studer-xtender.jpg'),
    pages: [
      'https://www.studer-innotec.com/en/products/xtender/',
      'https://www.studer-innotec.com/en/products/xtender/xtm/',
      'https://shop.krannich-solar.com/de-en/search?search=studer%20xtender',
      'https://www.solartraders.com/en/search?q=studer+xtender',
    ],
    prefer: /xtender|studer|xtm|product|upload|media|cdn/i,
  },
  {
    dest: path.join(inv, 'felicity-hybrid.jpg'),
    pages: [
      'https://eu.felicitysolar.com/',
      'https://us.felicitysolar.com/',
      'https://latam.felicitysolar.com/',
      'https://7sun.eu/en/search?controller=search&s=felicity+inverter',
      'https://autosolar.co/busqueda?controller=search&s=3004616',
      'https://autosolar.co/busqueda?controller=search&s=felicity+inversor+8kw',
    ],
    prefer: /felicity|ivem|ivcm|hybrid|inverter|inversor|3004616|3004249/i,
  },
  {
    dest: path.join(bat, 'huawei-luna.jpg'),
    pages: [
      'https://solar.huawei.com/eu/products/Residential/Energy-Storage/LUNA2000',
      'https://solar.huawei.com/en/products',
      'https://shop.krannich-solar.com/de-en/search?search=LUNA2000',
      'https://www.europe-solarstore.com/huawei-luna2000-5-e0.html',
      'https://www.solartraders.com/en/search?q=luna2000',
    ],
    prefer: /luna2000|luna|battery|storage|energy-storage|huawei/i,
  },
  {
    dest: path.join(bat, 'soluna-battery.jpg'),
    pages: [
      'https://www.solunabattery.com/',
      'https://www.solunabattery.com/products/',
      'https://shop.krannich-solar.com/de-en/search?search=soluna',
      'https://www.europe-solarstore.com/search?controller=search&s=soluna',
      'https://www.solartraders.com/en/search?q=soluna+battery',
      'https://solux.energy/search?q=soluna',
    ],
    prefer: /soluna|eos|battery|pack|hv|product|cdn|media/i,
  },
];

for (const job of jobs) {
  const ok = await grab(job.dest, job.pages, job.prefer);
  if (!ok) console.warn('FAIL', path.basename(job.dest));
}

console.log('done');
