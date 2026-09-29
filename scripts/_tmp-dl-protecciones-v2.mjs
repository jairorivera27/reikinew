import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'images', 'productos-tienda', 'protecciones');
fs.mkdirSync(outDir, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const BAD =
  /colombia-map|logo|icon|sprite|favicon|banner|facebook|twitter|payment|flag|avatar|cart|whatsapp|seguridad_de_compra|grantia|envio\/|kit-|lifestyle|EMPRESAS/i;

async function download(url, dest, minBytes = 12000) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'image/avif,image/webp,image/*,*/*',
        Referer: new URL(url).origin + '/',
      },
      redirect: 'follow',
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const head = buf.slice(0, 32);
    const isImg =
      head[0] === 0xff || // jpeg
      (head[0] === 0x89 && head[1] === 0x50) || // png
      head.toString('utf8', 0, 4) === 'RIFF' ||
      head.toString('utf8', 0, 4) === 'WEBP';
    if (!r.ok || buf.length < minBytes || !isImg) {
      console.log('SKIP', r.status, buf.length, isImg, url.slice(0, 120));
      return false;
    }
    fs.writeFileSync(dest, buf);
    console.log('OK', path.basename(dest), buf.length);
    return true;
  } catch (e) {
    console.log('FAIL', e.message, String(url).slice(0, 100));
    return false;
  }
}

async function getHtml(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
  console.log('HTML', r.status, url);
  if (!r.ok) return '';
  return await r.text();
}

function extractImgs(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/gi)) {
    out.add(m[0].replace(/&amp;/g, '&'));
  }
  for (const m of html.matchAll(/(?:href|src|data-src|data-image|data-zoom-image)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)) {
    let u = m[1].split(/\s+/)[0].replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/') && base) u = base + u;
    out.add(u);
  }
  // Autosolar product links -> infer image path from product id in URL
  for (const m of html.matchAll(/https?:\/\/(?:cdn\.)?autosolar\.co\/[^"'\\\s>]+/gi)) {
    out.add(m[0]);
  }
  return [...out].filter((x) => !BAD.test(x));
}

function productImgCandidatesFromSearch(html) {
  // Find product cards with image paths like /images/55041xx/name.jpg
  const ids = new Set();
  for (const m of html.matchAll(/cdn\.autosolar\.co\/images\/(\d+)\/([a-z0-9\-]+)-(?:[a-f0-9]{10,})(?:-thumb(?:2x)?)?\.(jpg|png|webp)/gi)) {
    ids.add(`https://cdn.autosolar.co/images/${m[1]}/${m[2]}-${m[0].match(/-([a-f0-9]{10,})/)?.[1] || ''}.${m[3]}`.replace(/-\./, '.'));
  }
  const full = [];
  for (const m of html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/\d+\/[a-z0-9\-]+\.jpg/gi)) {
    if (!/-thumb/i.test(m[0])) full.push(m[0]);
  }
  for (const m of html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/\d+\/[a-z0-9\-]+-[a-f0-9]+\.jpg/gi)) {
    if (!/-thumb/i.test(m[0])) full.push(m[0].replace(/-thumb(?:2x)?/, ''));
  }
  return [...new Set(full)];
}

async function fromAutosolarSearch(query, destName, mustMatch) {
  const dest = path.join(outDir, destName);
  const url = `https://autosolar.co/busqueda?controller=search&s=${encodeURIComponent(query)}`;
  const html = await getHtml(url);
  let imgs = productImgCandidatesFromSearch(html);
  imgs = imgs.filter((u) => !BAD.test(u));
  if (mustMatch) imgs = imgs.filter((u) => mustMatch.test(u));
  console.log('candidates', destName, imgs.slice(0, 8));
  for (const u of imgs) {
    if (await download(u, dest, 15000)) return true;
  }
  // Also try product page links
  const links = [...html.matchAll(/href="(https:\/\/autosolar\.co\/[^"]+)"/gi)]
    .map((m) => m[1])
    .filter((u) => /breaker|dps|fusible|switch|seccionador|suntree|victron|citel|leader|wifi|portafusible|magnetotermico|interruptor/i.test(u) && !/busqueda|kit-/i.test(u));
  for (const link of [...new Set(links)].slice(0, 6)) {
    const ph = await getHtml(link);
    const pimgs = productImgCandidatesFromSearch(ph).filter((u) => !BAD.test(u));
    console.log('product page imgs', link.slice(0, 80), pimgs.slice(0, 5));
    for (const u of pimgs) {
      if (await download(u, dest, 15000)) return true;
    }
    // generic extract
    for (const u of extractImgs(ph, 'https://autosolar.co').filter((x) => /cdn\.autosolar\.co\/images\/\d+\//i.test(x) && !BAD.test(x))) {
      const full = u.replace(/-thumb(?:2x)?\./, '.');
      if (await download(full, dest, 15000)) return true;
    }
  }
  return false;
}

async function fromAnyPages(pages, destName, filterRe) {
  const dest = path.join(outDir, destName);
  for (const page of pages) {
    const html = await getHtml(page);
    let imgs = extractImgs(html, new URL(page).origin);
    if (filterRe) imgs = imgs.filter((u) => filterRe.test(u));
    imgs = imgs.filter((u) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u) && !BAD.test(u));
    console.log(destName, 'page imgs', imgs.slice(0, 10));
    for (const u of imgs.slice(0, 20)) {
      if (await download(u.replace(/-thumb(?:2x)?\./, '').replace(/-\d+x\d+\./, '.'), dest, 10000)) return true;
    }
  }
  return false;
}

// Remove known bad map images
for (const f of fs.readdirSync(outDir)) {
  const p = path.join(outDir, f);
  if (fs.statSync(p).size === 54077) {
    fs.unlinkSync(p);
    console.log('DEL map fake', f);
  }
}

// Victron: try shopify / europe solar / official document PNGs
await fromAnyPages(
  [
    'https://shop.arizon.com.au/products/smart-batteryprotect-12-24v-100a',
    'https://www.europe-solarstore.com/victron-energy-smart-batteryprotect-12-24v-100a.html',
    'https://www.victronenergy.com/battery_protect/smart-battery-protect',
  ],
  'victron-batteryprotect.jpg',
  /batteryprotect|BatteryProtect|victron|cdn\.shopify|catalog\/product/i
);

// Autosolar family searches with stricter filters
const jobs = [
  ['breaker dc suntree', 'suntree-sl7n-dc.jpg', /breaker|sl7|dc|suntree/i],
  ['breaker ac suntite OR suntree', 'suntree-scb8-ac.jpg', /breaker|scb|ac|suntree/i],
  ['interruptor magnetotermico dc solar', 'suntree-sl7n-dc.jpg', /breaker|magnetotermico|dc/i],
  ['seccionador dc solar', 'suntree-siso-dc.jpg', /seccionador|isolator|siso|dc/i],
  ['dps dc solar 1000v', 'suntree-spd-dc.jpg', /dps|spd|supresor|surge/i],
  ['dps ac 40ka', 'suntree-spd-ac.jpg', /dps|spd|supresor/i],
  ['portafusible solar dc', 'generic-pv-fuse.jpg', /fusible|fuse|portafusible/i],
  ['breaker ac 63a 1p', 'generic-mcb-ac.jpg', /breaker|magnetotermico|63a|32a/i],
  ['breaker caja moldeada 250a', 'generic-mccb.jpg', /250|400|mccb|moldeada/i],
  ['switch rotativo ac', 'suntree-sq8-switch.jpg', /switch|rotativo|interruptor/i],
  ['growatt shinewifi', 'growatt-wifi.jpg', /wifi|shine|stick|dongle/i],
  ['citel dps', 'citel-spd.jpg', /citel|dps|spd/i],
];

for (const [q, name, re] of jobs) {
  if (fs.existsSync(path.join(outDir, name)) && fs.statSync(path.join(outDir, name)).size > 20000) {
    console.log('KEEP', name);
    continue;
  }
  await fromAutosolarSearch(q, name, re);
}

// Alibaba / Made-in-China style CDNs for Suntree (common product shots)
const alibabaTries = [
  [
    'suntree-sl7n-dc.jpg',
    [
      'https://sc04.alicdn.com/kf/H8c0e0e0e0.jpg', // placeholder unlikely
    ],
  ],
];

// Official-ish Suntree / distributor pages
await fromAnyPages(
  [
    'https://www.made-in-china.com/showroom/suntree-electric/product-listgrouplist-1.html',
    'https://suntree.en.alibaba.com/productgrouplist-803123258/Circuit_Breaker.html',
  ],
  'suntree-sl7n-dc.jpg',
  /alicdn|suntree|breaker|mcb|SL7/i
);

await fromAnyPages(
  [
    'https://autosolar.es/protecciones-electricas',
    'https://autosolar.es/busqueda?controller=search&s=suntree',
  ],
  'suntree-sl7n-dc.jpg',
  /cdn\.autosolar|breaker|suntree|sl7/i
);

console.log('\n=== FINAL ===');
for (const f of fs.readdirSync(outDir).sort()) {
  console.log(f.padEnd(36), fs.statSync(path.join(outDir, f)).size);
}
