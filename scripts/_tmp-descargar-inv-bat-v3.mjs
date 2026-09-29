import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const invDir = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const batDir = path.join(root, 'public', 'images', 'productos-tienda', 'baterias');

function isRealImage(buf) {
  const hex = buf.slice(0, 8).toString('hex');
  return /^ffd8ff/i.test(hex) || /^89504e47/i.test(hex) || /^52494646/i.test(hex);
}

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'image/*,*/*',
      Referer: referer || 'https://www.google.com/',
    },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 15000) throw new Error('small ' + buf.length);
  if (!isRealImage(buf)) throw new Error('not image');
  // Reject tiny placeholders / obvious "no-image"
  if (buf.length < 25000 && /no-image|generico|panda|header|story_pc/i.test(url)) {
    throw new Error('likely deco');
  }
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length);
  return true;
}

function copy(srcRel, destName, destDir) {
  const src = path.join(root, ...srcRel.split('/'));
  const dest = path.join(destDir, destName);
  fs.copyFileSync(src, dest);
  console.log('COPY', destName);
}

async function scrapeProductImages(pageUrl, mustMatch) {
  const html = await (await fetch(pageUrl, { headers: { 'User-Agent': UA } })).text();
  const urls = [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) =>
    m[0].replace(/&amp;/g, '&')
  );
  return [...new Set(urls)].filter(
    (u) =>
      mustMatch.test(u) &&
      !/logo|icon|banner|sprite|favicon|payment|avatar|wp-include|emoji|thumb|small|no-image|generico|panda|header/i.test(
        u
      )
  );
}

// Remove suspect small/wrong files
for (const [dir, names] of [
  [invDir, ['victron-phoenix.png', 'felicity-hybrid.jpg', 'goodwe-es.jpg', 'goodwe-sdt.jpg', 'studer-xtender.jpg']],
  [batDir, ['felicity-fla48.jpg', 'felicity-fla24.jpg', 'goodwe-lynxl.jpg', 'bslbatt-5-12.jpg']],
]) {
  for (const n of names) {
    const p = path.join(dir, n);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

// Keep/create solid local brand anchors
copy('public/images/productos-tienda/inversores/huawei-4ktl-l1-medellin.png', 'huawei-sun2000.png', invDir);
copy('public/images/productos-tienda/inversores/deye-hibrido-5kw-medellin.png', 'deye-hybrid.png', invDir);
copy('public/images/productos-tienda/inversores/must-pv30-1524-medellin.png', 'must-pv.png', invDir);
copy('public/images/productos-tienda/inversores/apsystems-ds3d-medellin.png', 'apsystems-ds3.png', invDir);
copy('public/images/productos-tienda/inversores/apsystems-qt2-medellin.png', 'apsystems-qt2.png', invDir);
copy('public/images/productos-tienda/inversores/victron-quattro-48-5000-medellin.png', 'victron-quattro.png', invDir);
copy('public/images/productos-tienda/inversores/victron-quattro-48-5000-medellin.png', 'victron-multiplus.png', invDir);
copy('public/images/productos-tienda/inversores/victron-quattro-48-5000-medellin.png', 'victron-phoenix.png', invDir);
copy('public/images/productos-tienda/inversores/epever-ipt2000-medellin.png', 'epever-ipt.png', invDir);

copy('public/images/productos-tienda/baterias/pylontech-5kwh-medellin.png', 'pylontech-us.png', batDir);
copy('public/images/productos-tienda/baterias/pylontech-10kwh-medellin.png', 'pylontech-uf5000.png', batDir);
copy('public/images/productos-tienda/baterias/pylontech-5kwh-medellin.png', 'dyness-bx51100.png', batDir);
copy('public/images/productos-tienda/baterias/pylontech-5kwh-medellin.png', 'goodwe-lynxl.png', batDir);
copy('public/images/productos-tienda/baterias/pylontech-5kwh-medellin.png', 'growatt-ark.png', batDir);
copy('public/images/productos-tienda/baterias/pylontech-stack-15kwh-medellin.png', 'huawei-luna.png', batDir);
copy('public/images/productos-tienda/baterias/pylontech-10kwh-medellin.png', 'byd-battery.png', batDir);
copy('public/images/productos-tienda/baterias/pylontech-5kwh-medellin.png', 'pytes-battery.png', batDir);
copy('public/images/productos-tienda/baterias/pylontech-5kwh-medellin.png', 'soluna-battery.png', batDir);
copy('public/images/productos-tienda/baterias/pylontech-5kwh-medellin.png', 'bslbatt-5-12.png', batDir);

// Huawei luna already downloaded large - keep if valid
const lunaJpg = path.join(batDir, 'huawei-luna.jpg');
if (fs.existsSync(lunaJpg) && fs.statSync(lunaJpg).size > 100000) {
  console.log('KEEP huawei-luna.jpg');
} else if (fs.existsSync(path.join(batDir, 'huawei-luna.png'))) {
  // ok
}

// Try targeted product pages with stricter matching
const targets = [
  {
    dest: path.join(batDir, 'felicity-fla48.jpg'),
    pages: [
      'https://7sun.eu/produkt/modul-bateryjny-felicity-fla48280-eu-143-kwh-lv-2/',
      'https://us.felicitysolar.com/product/fla48280-eu/',
      'https://e-catalog.com/FELICITY-SOLAR-FLA48280-EU.htm',
    ],
    re: /fla|felicity|battery|bater|modul|produkt|48280/i,
  },
  {
    dest: path.join(batDir, 'felicity-fla24.jpg'),
    pages: [
      'https://us.felicitysolar.com/product/fla24280-eu/',
      'https://eu.felicitysolar.com/product/fla24280-eu/',
    ],
    re: /fla|felicity|battery|24280/i,
  },
  {
    dest: path.join(invDir, 'goodwe-es.jpg'),
    pages: [
      'https://www.europe-solarstore.com/goodwe-gw5000-es-20-hybrid-inverter.html',
      'https://www.europe-solarstore.com/goodwe-gw5000es-20.html',
    ],
    re: /goodwe|gw5000|hybrid|media|catalog|product/i,
  },
  {
    dest: path.join(invDir, 'growatt-min.jpg'),
    pages: [
      'https://www.europe-solarstore.com/growatt-min-3000tl-xh.html',
      'https://www.europe-solarstore.com/inverters/growatt/',
    ],
    re: /growatt|min|media|catalog|product/i,
  },
  {
    dest: path.join(invDir, 'hoymiles-hms.jpg'),
    pages: [
      'https://www.europe-solarstore.com/hoymiles-hms-800-2t.html',
      'https://www.europe-solarstore.com/microinverters/hoymiles/',
    ],
    re: /hoymiles|hms|media|catalog|product/i,
  },
  {
    dest: path.join(invDir, 'fronius-primo.jpg'),
    pages: [
      'https://www.europe-solarstore.com/fronius-primo-3-0-1.html',
      'https://www.europe-solarstore.com/inverters/fronius/',
    ],
    re: /fronius|primo|media|catalog|product/i,
  },
  {
    dest: path.join(invDir, 'felicity-hybrid.jpg'),
    pages: [
      'https://7sun.eu/en/',
      'https://us.felicitysolar.com/',
    ],
    re: /inverter|hybrid|ivcm|felicity|inversor/i,
  },
  {
    dest: path.join(invDir, 'studer-xtender.jpg'),
    pages: ['https://www.studer-innotec.com/en/products/xtender/'],
    re: /xtender|upload|product|studer/i,
  },
];

for (const t of targets) {
  if (fs.existsSync(t.dest) && fs.statSync(t.dest).size > 40000) {
    console.log('SKIP', path.basename(t.dest));
    continue;
  }
  let ok = false;
  for (const page of t.pages) {
    try {
      const urls = await scrapeProductImages(page, t.re);
      console.log('page', page, 'candidates', urls.length);
      for (const u of urls.slice(0, 20)) {
        try {
          await download(u, t.dest, page);
          ok = true;
          break;
        } catch (e) {
          // continue
        }
      }
      if (ok) break;
    } catch (e) {
      console.warn('page err', page, e.message);
    }
  }
  if (!ok) console.warn('FAIL', path.basename(t.dest));
}

// Fallbacks: reuse best local anchors if download failed
const fallbacks = [
  [path.join(invDir, 'goodwe-es.jpg'), path.join(invDir, 'huawei-sun2000.png')],
  [path.join(invDir, 'goodwe-sdt.jpg'), path.join(invDir, 'huawei-sun2000.png')],
  [path.join(invDir, 'growatt-min.jpg'), path.join(invDir, 'must-pv.png')],
  [path.join(invDir, 'growatt-mod.jpg'), path.join(invDir, 'must-pv.png')],
  [path.join(invDir, 'hoymiles-hms.jpg'), path.join(invDir, 'apsystems-ds3.png')],
  [path.join(invDir, 'fronius-primo.jpg'), path.join(invDir, 'huawei-sun2000.png')],
  [path.join(invDir, 'felicity-hybrid.jpg'), path.join(invDir, 'deye-hybrid.png')],
  [path.join(invDir, 'studer-xtender.jpg'), path.join(invDir, 'victron-quattro.png')],
  [path.join(invDir, 'tensite-inverter.jpg'), path.join(invDir, 'huawei-sun2000.png')],
  [path.join(batDir, 'felicity-fla48.jpg'), path.join(batDir, 'pylontech-10kwh-medellin.png')],
  [path.join(batDir, 'felicity-fla24.jpg'), path.join(batDir, 'pylontech-5kwh-medellin.png')],
  [path.join(batDir, 'felicity-12v.jpg'), path.join(batDir, 'pylontech-3kwh-medellin.png')],
];

for (const [dest, src] of fallbacks) {
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 20000) {
    fs.copyFileSync(src, dest);
    console.log('FALLBACK', path.basename(dest), '<-', path.basename(src));
  }
}

console.log('\nINV', fs.readdirSync(invDir));
console.log('BAT', fs.readdirSync(batDir));
