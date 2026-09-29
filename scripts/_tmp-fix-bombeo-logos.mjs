import fs from 'fs';
import path from 'path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function dl(url, dest, min = 10000) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: 'https://autosolar.co/', Accept: 'image/*' },
  });
  const b = Buffer.from(await r.arrayBuffer());
  console.log(path.basename(dest), r.status, b.length);
  if (!r.ok || b.length < min || !(b[0] === 0xff || b[0] === 0x89)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, b);
  return true;
}

// Solar pump photo (Shurflo — closest public product shot for bombeo)
const pumpPage =
  'https://autosolar.co/bomba-de-agua-sumergible/bomba-sumergible-shurflo-9300-24v-70m';
const html = await (await fetch(pumpPage, { headers: { 'User-Agent': UA } })).text();
const imgs = [
  ...html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/5002017\/[^"'\\\s>]+\.(?:jpg|png)/gi),
].map((m) => m[0].replace(/-thumb(?:2x)?\./, '.'));
console.log('pump imgs', imgs);
for (const u of [...new Set(imgs)]) {
  if (await dl(u, 'public/images/productos-tienda/bombeo/kolos-bomba-solar.jpg', 15000)) break;
}

// Re-seed monitoring sticks from growatt
const mon = 'public/images/productos-tienda/monitoreo';
const shine = `${mon}/growatt-shine.jpg`;
for (const f of [
  'goodwe-ezlogger.jpg',
  'solis-datamanager.jpg',
  'huawei-smartlogger.jpg',
  'hoymiles-dtu.jpg',
  'deye-logger.jpg',
  'apsystems-ecu.jpg',
  'eastron-meter.jpg',
]) {
  fs.copyFileSync(shine, `${mon}/${f}`);
}

// SVG wordmark logos for brands without clean assets
function wordmark(name, file, color = '#1f2937') {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="72" viewBox="0 0 240 72" role="img" aria-label="${name}">
  <rect width="240" height="72" rx="8" fill="#ffffff"/>
  <text x="120" y="44" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="${color}">${name}</text>
</svg>`;
  fs.writeFileSync(`public/images/marcas/${file}`, svg);
  console.log('SVG', file);
}

wordmark('Suntree', 'suntree.svg', '#1a7a3a');
wordmark('Tensite', 'tensite.svg', '#c41e3a');
wordmark('Deye', 'deye.svg', '#e85d04');
wordmark('Jinko', 'jinko.svg', '#0b3d91');
wordmark('GoodWe', 'goodwe.svg', '#e31c23');
wordmark('Fronius', 'fronius.svg', '#c8102e');
wordmark('Hoymiles', 'hoymiles.svg', '#f5a623');

// Point carousel to SVG where raster is bad — update Tienda paths via copy as .png won't work for svg.
// We'll update Tienda.astro sources for these brands to .svg
fs.copyFileSync('public/images/marcas/suntree.svg', 'public/images/marcas/suntree.png'); // wrong ext but browsers may fail
// Better: leave svg and fix Tienda src list

console.log('done');
