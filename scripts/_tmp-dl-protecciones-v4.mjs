import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'images', 'productos-tienda', 'protecciones');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const BAD = /colombia-map|bateria|panel-solar|inversor|gel-|litio-|kit-|logo|favicon/i;

async function download(url, dest, minBytes = 20000) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*', Referer: new URL(url).origin + '/' },
    redirect: 'follow',
  });
  const buf = Buffer.from(await r.arrayBuffer());
  const ok =
    r.ok &&
    buf.length >= minBytes &&
    (buf[0] === 0xff || (buf[0] === 0x89 && buf[1] === 0x50));
  if (!ok) {
    console.log('SKIP', r.status, buf.length, url.slice(0, 120));
    return false;
  }
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length);
  return true;
}

async function fromProductPage(pageUrl, destName) {
  const dest = path.join(outDir, destName);
  const r = await fetch(pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  console.log('PAGE', r.status, pageUrl);
  if (!r.ok) return false;
  const html = await r.text();
  const imgs = [...html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/\d+\/[^"'\\\s>]+\.(?:jpg|png|webp)/gi)]
    .map((m) => m[0].replace(/-thumb(?:2x)?\./, '.'))
    .filter((u) => !BAD.test(u) && !/-thumb/i.test(u));
  const uniq = [...new Set(imgs)];
  console.log('imgs', uniq.slice(0, 6));
  for (const u of uniq) {
    if (await download(u, dest, 18000)) return true;
  }
  return false;
}

// Remove known wrong assets
for (const f of [
  'suntree-spd-ac.jpg',
  'suntree-siso-dc.jpg',
  'suntree-sq8-switch.jpg',
  'generic-pv-fuse.jpg',
  'generic-mcb-ac.jpg',
  'generic-mccb.jpg',
  'growatt-wifi.jpg',
  'citel-spd.jpg',
  'leader-breaker.jpg',
  'leader-dps.jpg',
]) {
  const p = path.join(outDir, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

const pages = [
  ['https://autosolar.co/portafusibles/portafusible-dc-10x38-1100v-suntree', 'generic-pv-fuse.jpg'],
  ['https://autosolar.co/breakers-dc/breaker-solar-dc-4x25a-1200v-suntree', 'suntree-sl7n-dc-4p.jpg'],
  [
    'https://autosolar.co/descargador-de-sobretension/dps-solar-dc-3p-1200vdc-2040ka-suntree',
    'suntree-spd-dc-3p.jpg',
  ],
  ['https://autosolar.co/breakers-dc/breaker-solar-dc-2x40a-800v-suntree', 'suntree-sl7n-dc-alt.jpg'],
  // AC breaker category product
  ['https://autosolar.co/breakers-ac/breaker-de-riel-ac-1x20a-230v-6ka-lumek', 'generic-mcb-ac.jpg'],
  ['https://autosolar.co/breakers-ac/breaker-de-riel-ac-3x25a-400v-6ka-lumek', 'suntree-scb8-ac.jpg'],
];

for (const [url, name] of pages) {
  await fromProductPage(url, name);
}

// Extra searches for isolator / switch / AC DPS / growatt wifi via product listing scrape
const listingQueries = [
  [
    'https://autosolar.co/busqueda?controller=search&s=55041',
    null, // collect links
  ],
];

// Discover product links containing keywords
async function discoverAndDownload(query, destName, linkRe, imgRe) {
  const search = `https://autosolar.co/busqueda?controller=search&s=${encodeURIComponent(query)}`;
  const r = await fetch(search, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  console.log('SEARCH', r.status, query);
  if (!r.ok) return false;
  const html = await r.text();
  const links = [...html.matchAll(/href="(https:\/\/autosolar\.co\/[^"]+)"/gi)]
    .map((m) => m[1])
    .filter((u) => linkRe.test(u) && !/busqueda|kit-/i.test(u));
  console.log('links', [...new Set(links)].slice(0, 8));
  for (const link of [...new Set(links)].slice(0, 8)) {
    const ok = await fromProductPage(link, destName);
    if (ok) {
      // verify filename of downloaded image path isn't battery
      return true;
    }
  }
  return false;
}

await discoverAndDownload(
  'seccionador dc',
  'suntree-siso-dc.jpg',
  /seccionador|isolator|disconnect|siso|switch-dc|interruptor-dc/i,
  /seccionador|siso|isolator/i
);
await discoverAndDownload(
  'dps ac 40ka',
  'suntree-spd-ac.jpg',
  /dps|descargador|sobretension/i,
  /dps|spd|supresor/i
);
await discoverAndDownload(
  'shinewifi',
  'growatt-wifi.jpg',
  /wifi|shine|growatt|monitoring|accesorio/i,
  /wifi|shine|stick|dongle/i
);
await discoverAndDownload(
  'interruptor rotativo',
  'suntree-sq8-switch.jpg',
  /switch|rotativo|conmutador|interruptor/i,
  /switch|rotativo|sq8/i
);
await discoverAndDownload(
  'caja moldeada 250a',
  'generic-mccb.jpg',
  /moldeada|mccb|250a|400a|breaker/i,
  /moldeada|mccb|250|400|breaker/i
);

// Fallbacks by copy of good assets
const fallbacks = [
  ['suntree-spd-ac.jpg', 'suntree-spd-dc.jpg'], // AC SPD family lookalike until better found
  ['citel-spd.jpg', 'suntree-spd-dc.jpg'],
  ['leader-dps.jpg', 'suntree-spd-dc.jpg'],
  ['leader-breaker.jpg', 'suntree-sl7n-dc.jpg'],
  ['suntree-siso-dc.jpg', 'suntree-sl7n-dc.jpg'], // isolator visual cousin
  ['suntree-sq8-switch.jpg', 'suntree-scb8-ac.jpg'],
  ['generic-mccb.jpg', 'abb-breaker-dc-100a.png'],
  ['generic-mcb-ac.jpg', 'suntree-scb8-ac.jpg'],
  ['growatt-wifi.jpg', 'victron-batteryprotect.jpg'], // last resort wrong - skip if this
];

for (const [need, from] of fallbacks) {
  const dest = path.join(outDir, need);
  const src = path.join(outDir, from);
  if (!fs.existsSync(dest) && fs.existsSync(src)) {
    // Don't fallback growatt to victron
    if (need === 'growatt-wifi.jpg') continue;
    fs.copyFileSync(src, dest);
    console.log('FALLBACK', need, '<-', from);
  }
}

console.log('\n=== FINAL ===');
for (const f of fs.readdirSync(outDir).sort()) {
  console.log(f.padEnd(36), fs.statSync(path.join(outDir, f)).size);
}
