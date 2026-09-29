import fs from 'fs';
import path from 'path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const dest = 'public/images/productos-tienda/inversores/felicity-hybrid.jpg';

async function dl(url, referer, min = 15000) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: referer || new URL(url).origin + '/',
        Accept: 'image/avif,image/webp,image/*,*/*',
      },
      redirect: 'follow',
    });
    const buf = Buffer.from(await r.arrayBuffer());
    console.log(r.status, buf.length, url.slice(0, 140));
    if (!r.ok || buf.length < min) return false;
    // reject obvious HTML/error pages
    if (buf.slice(0, 200).toString('utf8').includes('<html')) return false;
    fs.writeFileSync(dest, buf);
    return true;
  } catch (e) {
    console.log('fail', e.message, url.slice(0, 100));
    return false;
  }
}

const pages = [
  'https://www.felicitysolar.com/product/ivem3-5kw-lv/',
  'https://www.felicitysolar.com/ph/product/ivem5048/',
  'https://latam.felicitysolar.com/',
  'https://tamsolec.com/product/ivem5048-5kw-hybrid-inverter-48v-with-built-in-100a-mppt/',
  'https://autosolar.co/busqueda?controller=search&s=felicity+ivem',
  'https://autosolar.co/busqueda?controller=search&s=inversor+felicity+5kw',
];

const candidates = [];

for (const page of pages) {
  try {
    const r = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    console.log('PAGE', r.status, page);
    if (!r.ok) continue;
    const html = await r.text();
    for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/gi)) {
      candidates.push(m[0].replace(/&amp;/g, '&'));
    }
    for (const m of html.matchAll(/(?:src|data-src|data-large_image|data-srcset)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)) {
      let u = m[1].split(' ')[0].replace(/&amp;/g, '&');
      if (u.startsWith('//')) u = 'https:' + u;
      else if (u.startsWith('/')) u = new URL(page).origin + u;
      candidates.push(u);
    }
  } catch (e) {
    console.log('page fail', page, e.message);
  }
}

const uniq = [...new Set(candidates)];
const ranked = uniq
  .filter((u) => !/logo|icon|favicon|banner|EMPRESAS|casas-para|cargador|bodega|para-web|cropped|avatar|payment|facebook|wifi-para|panda|one-para|CAJA|Microinversor|CONTROLADOR|baterias-para|Inversores-para|Felicity-Solar\.jpg/i.test(u))
  .filter((u) => /ivem|5048|hybrid|inversor|inverter|felicity|wp-content\/uploads|cdn\.autosolar|woocommerce|product/i.test(u));

console.log('ranked', ranked.length);
ranked.slice(0, 40).forEach((u) => console.log(u));

// Prefer autosolar product images and numbered felicity gallery webps that aren't tiny
const tryOrder = [
  ...ranked.filter((u) => /cdn\.autosolar|30046|ivem|5048/i.test(u)),
  ...ranked.filter((u) => /1599722876|uploads\/202[34]/i.test(u)),
  ...ranked,
];

let ok = false;
for (const u of tryOrder) {
  const full = u.replace(/-thumb(?:2x)?\./, '.').replace(/-\d+x\d+\./, '.');
  if (await dl(full, 'https://www.felicitysolar.com/', 20000)) {
    console.log('SAVED', full);
    ok = true;
    break;
  }
}

if (!ok) {
  // last resorts known from previous audits / 7sun style
  const extras = [
    'https://7sun.eu/userdata/public/gfx/felicity/ivem5048.jpg',
    'https://cdn.shopify.com/s/files/1/0558/9874/8123/products/felicity-ivem5048.jpg',
  ];
  for (const u of extras) {
    if (await dl(u, undefined, 10000)) {
      ok = true;
      break;
    }
  }
}

console.log('final ok', ok, fs.existsSync(dest) ? fs.statSync(dest).size : 0);
