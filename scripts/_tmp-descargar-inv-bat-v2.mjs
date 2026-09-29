import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const invDir = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const batDir = path.join(root, 'public', 'images', 'productos-tienda', 'baterias');
fs.mkdirSync(invDir, { recursive: true });
fs.mkdirSync(batDir, { recursive: true });

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      Referer: referer || new URL(url).origin + '/',
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 12000) throw new Error(`small ${buf.length}`);
  if (/<!DOCTYPE|<html/i.test(buf.slice(0, 100).toString('utf8'))) throw new Error('html');
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url.slice(0, 110));
  return buf.length;
}

async function firstImageFromPage(pageUrl, preferRe) {
  const html = await (await fetch(pageUrl, { headers: { 'User-Agent': UA } })).text();
  const urls = [
    ...html.matchAll(
      /(?:src|href|content)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi
    ),
  ].map((m) => m[1].replace(/&amp;/g, '&'));
  const also = [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) =>
    m[0].replace(/&amp;/g, '&')
  );
  const all = [...new Set([...urls, ...also])].filter(
    (u) => !/logo|icon|banner|sprite|favicon|payment|flag|avatar|wp-include|emoji/i.test(u)
  );
  const ranked = all.sort((a, b) => {
    const score = (u) =>
      (preferRe && preferRe.test(u) ? 20 : 0) +
      (/product|upload|media|cdn|shop/i.test(u) ? 5 : 0) +
      (/thumb|small|icon/i.test(u) ? -8 : 4);
    return score(b) - score(a);
  });
  return ranked;
}

function copyLocal(srcRel, destAbs) {
  const src = path.join(root, ...srcRel.split('/'));
  if (!fs.existsSync(src)) throw new Error('missing local ' + srcRel);
  fs.copyFileSync(src, destAbs);
  console.log('COPY', path.basename(destAbs), '<-', srcRel);
}

// Wipe previous bad autosolar mismatches for our target filenames
for (const f of fs.readdirSync(invDir)) {
  if (
    /^(huawei-sun|goodwe-|growatt-|deye-|felicity-|victron-|hoymiles-|apsystems-|fronius-|must-|studer-|tensite-)/i.test(
      f
    )
  ) {
    // keep medellin originals
    if (/medellin/i.test(f)) continue;
    fs.unlinkSync(path.join(invDir, f));
  }
}
for (const f of fs.readdirSync(batDir)) {
  if (
    /^(felicity-|pylontech-us|pylontech-uf|dyness-|bslbatt-|goodwe-|growatt-|huawei-|byd-|pytes-|soluna-)/i.test(
      f
    )
  ) {
    if (/medellin/i.test(f)) continue;
    fs.unlinkSync(path.join(batDir, f));
  }
}

// --- Local brand anchors already in repo ---
copyLocal(
  'public/images/productos-tienda/inversores/huawei-4ktl-l1-medellin.png',
  path.join(invDir, 'huawei-sun2000.jpg'.replace('.jpg', '.png'))
);
copyLocal(
  'public/images/productos-tienda/inversores/deye-hibrido-5kw-medellin.png',
  path.join(invDir, 'deye-hybrid.png')
);
copyLocal(
  'public/images/productos-tienda/inversores/must-pv30-1524-medellin.png',
  path.join(invDir, 'must-pv.png')
);
copyLocal(
  'public/images/productos-tienda/inversores/apsystems-ds3d-medellin.png',
  path.join(invDir, 'apsystems-ds3.png')
);
copyLocal(
  'public/images/productos-tienda/inversores/apsystems-qt2-medellin.png',
  path.join(invDir, 'apsystems-qt2.png')
);
copyLocal(
  'public/images/productos-tienda/inversores/victron-quattro-48-5000-medellin.png',
  path.join(invDir, 'victron-quattro.png')
);
copyLocal(
  'public/images/productos-tienda/inversores/epever-ipt2000-medellin.png',
  path.join(invDir, 'epever-ipt.png')
);

for (const name of [
  'pylontech-5kwh-medellin.png',
  'pylontech-10kwh-medellin.png',
  'pylontech-3kwh-medellin.png',
  'pylontech-20kwh-medellin.png',
  'pylontech-stack-15kwh-medellin.png',
]) {
  // keep as-is
}

copyLocal(
  'public/images/productos-tienda/baterias/pylontech-5kwh-medellin.png',
  path.join(batDir, 'pylontech-us.png')
);
copyLocal(
  'public/images/productos-tienda/baterias/pylontech-10kwh-medellin.png',
  path.join(batDir, 'pylontech-uf5000.png')
);

// --- Curated remote downloads ---
const curated = [
  // Victron official product photos
  {
    dest: path.join(invDir, 'victron-multiplus.png'),
    urls: [],
    page: 'https://www.victronenergy.com/inverters-chargers/multiplus-ii',
    prefer: /MultiPlus|front|upload/i,
    referer: 'https://www.victronenergy.com/',
  },
  {
    dest: path.join(invDir, 'victron-phoenix.png'),
    urls: [],
    page: 'https://www.victronenergy.com/inverters/phoenix-inverter-ve-direct',
    prefer: /Phoenix|front|upload/i,
    referer: 'https://www.victronenergy.com/',
  },
  // Felicity battery official
  {
    dest: path.join(batDir, 'felicity-fla48.jpg'),
    urls: [],
    page: 'https://eu.felicitysolar.com/product/fla48280-eu/',
    prefer: /fla48280|wp-content|upload|product/i,
    referer: 'https://eu.felicitysolar.com/',
  },
  {
    dest: path.join(batDir, 'felicity-fla24.jpg'),
    urls: [],
    page: 'https://eu.felicitysolar.com/product/fla24280-eu/',
    prefer: /fla24280|wp-content|upload|product/i,
    referer: 'https://eu.felicitysolar.com/',
  },
  // GoodWe / Growatt / Huawei / Hoymiles / Fronius / Dyness via distributor pages
  {
    dest: path.join(invDir, 'goodwe-es.jpg'),
    urls: [],
    page: 'https://en.goodwe.com/Ga/Index/single/id/999.html',
    prefer: /goodwe|ES|upload|product/i,
    referer: 'https://en.goodwe.com/',
  },
  {
    dest: path.join(invDir, 'growatt-min.jpg'),
    urls: [],
    page: 'https://www.growatt.com/products/residential-pv-inverter-min-tl-xh',
    prefer: /growatt|min|upload|product/i,
    referer: 'https://www.growatt.com/',
  },
  {
    dest: path.join(invDir, 'hoymiles-hms.jpg'),
    urls: [],
    page: 'https://www.hoymiles.com/products/microinverter/hms-series/',
    prefer: /hms|hoymiles|upload|product/i,
    referer: 'https://www.hoymiles.com/',
  },
  {
    dest: path.join(invDir, 'fronius-primo.jpg'),
    urls: [],
    page: 'https://www.fronius.com/en/solar-energy/installers-partners/products-solutions/residential-solutions/fronius-primo',
    prefer: /primo|fronius|upload|media/i,
    referer: 'https://www.fronius.com/',
  },
  {
    dest: path.join(batDir, 'dyness-bx51100.jpg'),
    urls: [],
    page: 'https://www.dyness.com/product/BX51100.html',
    prefer: /BX51100|dyness|upload|product/i,
    referer: 'https://www.dyness.com/',
  },
  {
    dest: path.join(batDir, 'huawei-luna.jpg'),
    urls: [],
    page: 'https://solar.huawei.com/eu/products/Residential/Energy-Storage/LUNA2000',
    prefer: /LUNA|huawei|upload|product/i,
    referer: 'https://solar.huawei.com/',
  },
];

// Extra known direct URLs (tried first)
const direct = [
  [
    path.join(invDir, 'victron-multiplus.png'),
    [
      'https://www.victronenergy.com/upload/documents/MultiPlus-II_48V_5kVA_230V_(front).png',
      'https://www.victronenergy.com/upload/documents/MultiPlus-II_48V_3kVA_230V_(front).png',
    ],
    'https://www.victronenergy.com/',
  ],
  [
    path.join(invDir, 'victron-phoenix.png'),
    [
      'https://www.victronenergy.com/upload/documents/Phoenix_Inverter_VE.Direct_12-250_(front).png',
      'https://www.victronenergy.com/upload/documents/Phoenix_Inverter_250VA_(front).jpg',
    ],
    'https://www.victronenergy.com/',
  ],
  [
    path.join(batDir, 'felicity-fla48.jpg'),
    [],
    'https://eu.felicitysolar.com/',
  ],
];

for (const [dest, urls, ref] of direct) {
  let ok = false;
  for (const u of urls) {
    try {
      await download(u, dest, ref);
      ok = true;
      break;
    } catch (e) {
      console.warn('direct fail', path.basename(dest), e.message);
    }
  }
  if (!ok && urls.length === 0) {
    // will try page scrape below
  }
}

for (const job of curated) {
  if (fs.existsSync(job.dest) && fs.statSync(job.dest).size > 20000) {
    console.log('SKIP exists', path.basename(job.dest));
    continue;
  }
  let urls = [...(job.urls || [])];
  if (job.page) {
    try {
      urls.push(...(await firstImageFromPage(job.page, job.prefer)));
    } catch (e) {
      console.warn('page fail', job.page, e.message);
    }
  }
  let ok = false;
  for (const u of urls.slice(0, 12)) {
    try {
      await download(u, job.dest, job.referer);
      ok = true;
      break;
    } catch {
      /* next */
    }
  }
  if (!ok) console.warn('FAIL curated', path.basename(job.dest));
}

// Distributor pages that usually work for lithium batteries / inverters
const morePages = [
  {
    dest: path.join(batDir, 'felicity-fla48.jpg'),
    page: 'https://7sun.eu/produkt/modul-bateryjny-felicity-fla48280-eu-143-kwh-lv-2/',
    prefer: /felicity|fla|battery|produkt/i,
  },
  {
    dest: path.join(batDir, 'goodwe-lynxl.jpg'),
    page: 'https://en.goodwe.com/Ga/Index/single/id/999.html',
    prefer: /lynx|battery|goodwe/i,
  },
  {
    dest: path.join(invDir, 'goodwe-sdt.jpg'),
    page: 'https://en.goodwe.com/',
    prefer: /SDT|goodwe|product/i,
  },
  {
    dest: path.join(invDir, 'growatt-mod.jpg'),
    page: 'https://www.growatt.com/',
    prefer: /MOD|MID|growatt|inverter/i,
  },
  {
    dest: path.join(batDir, 'growatt-ark.jpg'),
    page: 'https://www.growatt.com/',
    prefer: /ARK|battery|growatt/i,
  },
  {
    dest: path.join(batDir, 'byd-battery.jpg'),
    page: 'https://www.byd.com/eu/energy-storage',
    prefer: /battery|byd|hvm|hvs/i,
  },
  {
    dest: path.join(batDir, 'pytes-battery.jpg'),
    page: 'https://www.pytes.com/',
    prefer: /ebox|battery|pytes/i,
  },
  {
    dest: path.join(batDir, 'bslbatt-5-12.jpg'),
    page: 'https://www.bsl-battery.com/',
    prefer: /battery|bsl/i,
  },
  {
    dest: path.join(invDir, 'felicity-hybrid.jpg'),
    page: 'https://eu.felicitysolar.com/',
    prefer: /inverter|hybrid|ivcm|felicity/i,
  },
  {
    dest: path.join(invDir, 'studer-xtender.jpg'),
    page: 'https://www.studer-innotec.com/en/products/xtender/',
    prefer: /xtender|studer|product/i,
  },
];

for (const job of morePages) {
  if (fs.existsSync(job.dest) && fs.statSync(job.dest).size > 20000) {
    console.log('SKIP exists', path.basename(job.dest));
    continue;
  }
  try {
    const urls = await firstImageFromPage(job.page, job.prefer);
    let ok = false;
    for (const u of urls.slice(0, 15)) {
      try {
        await download(u, job.dest, job.page);
        ok = true;
        break;
      } catch {
        /* next */
      }
    }
    if (!ok) console.warn('FAIL more', path.basename(job.dest));
  } catch (e) {
    console.warn('FAIL more page', path.basename(job.dest), e.message);
  }
}

console.log('\nINV files:', fs.readdirSync(invDir).join(', '));
console.log('BAT files:', fs.readdirSync(batDir).join(', '));
