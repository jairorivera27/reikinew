import fs from 'fs';
import path from 'path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const root = 'public/images/productos-tienda';

async function dl(url, dest, min = 15000) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: new URL(url).origin + '/', Accept: 'image/*' },
      redirect: 'follow',
    });
    const b = Buffer.from(await r.arrayBuffer());
    const ok = r.ok && b.length >= min && (b[0] === 0xff || b[0] === 0x89);
    console.log(path.basename(dest), r.status, b.length, ok ? 'OK' : 'SKIP');
    if (!ok) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, b);
    return true;
  } catch (e) {
    console.log('FAIL', path.basename(dest), e.message);
    return false;
  }
}

async function fromPage(page, dest, mustRe) {
  const r = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  console.log('PAGE', r.status, page);
  if (!r.ok) return false;
  const html = await r.text();
  const imgs = [
    ...html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/\d+\/[^"'\\\s>]+\.(?:jpg|png|webp)/gi),
  ]
    .map((m) => m[0].replace(/-thumb(?:2x)?\./, '.'))
    .filter((u) => !/colombia-map|kit-|bateria-gel|panel-solar|inversor-on-grid/i.test(u));
  const ranked = mustRe ? imgs.filter((u) => mustRe.test(u)).concat(imgs) : imgs;
  for (const u of [...new Set(ranked)].slice(0, 12)) {
    if (await dl(u, dest, 18000)) return true;
  }
  return false;
}

// Delete known junk size (El Niño banner)
for (const sub of ['controladores', 'monitoreo', 'bombeo', 'accesorios']) {
  const d = path.join(root, sub);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).size === 57773) {
      fs.unlinkSync(p);
      console.log('DEL junk', sub, f);
    }
  }
}

// Victron SmartSolar: use Medellín MPPT as solid product photo until official lands,
// then try official/distributor pages
const mpptLocal = path.join(root, 'controladores', 'controlador-mppt-60a-medellin.png');
const smartDest = path.join(root, 'controladores', 'victron-smartsolar-mppt.jpg');
if (fs.existsSync(mpptLocal)) {
  // Prefer a real hardware photo over app screenshot currently saved
  fs.copyFileSync(mpptLocal, smartDest);
  console.log('SEED smartsolar from medellin mppt');
}
fs.copyFileSync(mpptLocal, path.join(root, 'controladores', 'victron-bluesolar-mppt.jpg'));
fs.copyFileSync(mpptLocal, path.join(root, 'controladores', 'inti-mppt.jpg'));
fs.copyFileSync(mpptLocal, path.join(root, 'controladores', 'studer-vs.jpg'));

await fromPage(
  'https://autosolar.co/controladores-de-carga/controlador-de-carga-mppt-victron-energy-smartsolar-10050',
  smartDest,
  /smartsolar|victron|mppt|100.?50/i
);
await fromPage(
  'https://autosolar.co/busqueda?controller=search&s=victron+smartsolar+100%2F50',
  smartDest,
  /smartsolar|10050|100-50|victron/i
);

// Try Victron EN product page image links
const vicHtml = await (
  await fetch('https://www.victronenergy.com/solar-charge-controllers/smartsolar-mppt-100-30-100-50', {
    headers: { 'User-Agent': UA },
  })
).text();
const vicImgs = [
  ...vicHtml.matchAll(/https:\/\/www\.victronenergy\.com\/upload\/documents\/[^"'\\\s>]+\.(?:png|jpg)/gi),
].map((m) => m[0]);
console.log('victron docs', vicImgs.slice(0, 10));
for (const u of vicImgs) {
  if (/SmartSolar.*100.?50.*(front)|100-50.*front/i.test(decodeURIComponent(u))) {
    if (await dl(u, smartDest, 20000)) break;
  }
}
for (const u of vicImgs) {
  if (/SmartSolar|MPPT/i.test(u) && /front/i.test(u)) {
    if (await dl(u, smartDest, 20000)) break;
  }
}

// Cerbo already good — GX Touch
await fromPage(
  'https://autosolar.co/busqueda?controller=search&s=victron+gx+touch+50',
  path.join(root, 'monitoreo', 'victron-gx-touch.jpg'),
  /touch|gx|victron/i
);
const cerbo = path.join(root, 'monitoreo', 'victron-cerbo-gx.jpg');
if (!fs.existsSync(path.join(root, 'monitoreo', 'victron-gx-touch.jpg')) && fs.existsSync(cerbo)) {
  fs.copyFileSync(cerbo, path.join(root, 'monitoreo', 'victron-gx-touch.jpg'));
}

// Kolos pump
await fromPage(
  'https://autosolar.co/bombas-de-agua-solar/bomba-solar-sumergible-kolos',
  path.join(root, 'bombeo', 'kolos-bomba-solar.jpg'),
  /kolos|bomba|pump|sumergible/i
);
await fromPage(
  'https://autosolar.co/busqueda?controller=search&s=bomba+solar+sumergible+kolos',
  path.join(root, 'bombeo', 'kolos-bomba-solar.jpg'),
  /kolos|bomba|sumergible/i
);

// Monitoring accessories
const monJobs = [
  [
    'https://autosolar.co/accesorios-de-inversores/monitorizacion-growatt-shine-wifi-x',
    'monitoreo/growatt-shine.jpg',
    /shine|wifi|3202018/i,
  ],
  [
    'https://autosolar.co/busqueda?controller=search&s=goodwe+ezlogger',
    'monitoreo/goodwe-ezlogger.jpg',
    /ezlogger|goodwe|logger/i,
  ],
  [
    'https://autosolar.co/busqueda?controller=search&s=hoymiles+dtu-pro',
    'monitoreo/hoymiles-dtu.jpg',
    /dtu|hoymiles/i,
  ],
  [
    'https://autosolar.co/busqueda?controller=search&s=deye+logger+wifi',
    'monitoreo/deye-logger.jpg',
    /deye|logger/i,
  ],
  [
    'https://autosolar.co/busqueda?controller=search&s=apsystems+ecu-r',
    'monitoreo/apsystems-ecu.jpg',
    /ecu|apsystems/i,
  ],
  [
    'https://autosolar.co/busqueda?controller=search&s=solis+wifi+stick',
    'monitoreo/solis-datamanager.jpg',
    /solis|wifi|stick|data/i,
  ],
  [
    'https://autosolar.co/busqueda?controller=search&s=huawei+smart+dongle',
    'monitoreo/huawei-smartlogger.jpg',
    /dongle|smartlogger|huawei/i,
  ],
  [
    'https://autosolar.co/busqueda?controller=search&s=eastron+sdm630',
    'monitoreo/eastron-meter.jpg',
    /eastron|sdm|medidor/i,
  ],
];

for (const [page, rel, re] of monJobs) {
  await fromPage(page, path.join(root, rel), re);
}

// Brand logos still missing: suntree, tensite — copy from product photos / text badge
const marcas = 'public/images/marcas';
fs.mkdirSync(marcas, { recursive: true });
// Use suntree breaker crop isn't easy; download from Autosolar manufacturer page
await fromPage('https://autosolar.co/fabricantes/suntree', path.join(marcas, 'suntree.png'), /suntree|logo/i);
await fromPage('https://autosolar.co/fabricantes/tensite', path.join(marcas, 'tensite.png'), /tensite|logo/i);

// Fix bad tiny/wrong logos by preferring known good local copies already in /images
const preferLocal = {
  'felicity.png': null, // too small 2134 - try cropped logo
  'jinko.png': null,
  'deye.png': null,
  'hoymiles.png': null,
};
await dl(
  'https://latam.felicitysolar.com/wp-content/uploads/2025/05/cropped-f-03-192x192.png',
  path.join(marcas, 'felicity.png'),
  1000
);
await dl('https://w3oss.hoymiles.com/uploadfile/1/202511/b832f191cc.png', path.join(marcas, 'hoymiles.png'), 2000);

console.log('\n=== sizes ===');
for (const sub of ['controladores', 'monitoreo', 'bombeo']) {
  for (const f of fs.readdirSync(path.join(root, sub))) {
    console.log(sub, f, fs.statSync(path.join(root, sub, f)).size);
  }
}
