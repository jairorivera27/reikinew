import fs from 'fs';
import path from 'path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const OUT_INV = 'public/images/productos-tienda/inversores';
const OUT_BAT = 'public/images/productos-tienda/baterias';

async function getHtml(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html', Referer: new URL(url).origin },
      redirect: 'follow',
    });
    console.log('HTML', r.status, url);
    if (!r.ok) return '';
    return await r.text();
  } catch (e) {
    console.log('HTML fail', url, e.message);
    return '';
  }
}

function extractImgs(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/gi)) {
    out.add(m[0].replace(/&amp;/g, '&'));
  }
  for (const m of html.matchAll(/(?:src|data-src|data-image|data-zoom-image)=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi)) {
    let u = m[1].replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/') && base) u = base + u;
    out.add(u);
  }
  // magento/json product images
  for (const m of html.matchAll(/"full":"(https?:\\\/\\\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)) {
    out.add(m[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&'));
  }
  for (const m of html.matchAll(/"img":"(https?:\\\/\\\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)) {
    out.add(m[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&'));
  }
  return [...out].filter(
    (x) => !/logo|icon|sprite|favicon|banner|facebook|twitter|payment|flag|avatar|cart|whatsapp|cropped-f-03|casas-para|cargador\.png|EMPRESAS|bodega|para-web|wifi-para|one-para|CAJA-para|Microinversor|CONTROLADOR|baterias-para|Inversores-para/i.test(x)
  );
}

async function download(url, dest, minBytes = 8000) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: new URL(url).origin + '/' },
      redirect: 'follow',
    });
    if (!r.ok) {
      console.log('DL', r.status, url);
      return false;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < minBytes) {
      console.log('DL small', buf.length, url);
      return false;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    console.log('OK', dest, buf.length, url.slice(0, 120));
    return true;
  } catch (e) {
    console.log('DL fail', url, e.message);
    return false;
  }
}

// --- Felicity inverter candidates (gallery webps, not lifestyle) ---
const felicityCandidates = [
  'https://latam.felicitysolar.com/wp-content/uploads/2024/07/1599722876470464514.webp',
  'https://latam.felicitysolar.com/wp-content/uploads/2023/08/1599722879684075522.webp',
  'https://latam.felicitysolar.com/wp-content/uploads/2024/07/Felicity-Solar.jpg',
  'https://www.felicitysolar.com/wp-content/uploads/2023/08/IVEM5048.png',
  'https://www.felicitysolar.com/wp-content/uploads/2024/01/IVEM5048.jpg',
];

let felicityOk = false;
for (const u of felicityCandidates) {
  if (await download(u, path.join(OUT_INV, 'felicity-hybrid.jpg'), 5000)) {
    felicityOk = true;
    break;
  }
}
if (!felicityOk) {
  const html = await getHtml('https://www.felicitysolar.com/ph/product/ivem5048/');
  const imgs = extractImgs(html, 'https://www.felicitysolar.com');
  console.log('felicity page imgs', imgs.slice(0, 15));
  for (const u of imgs) {
    if (/1599722876|IVEM|ivem|hybrid|inverter/i.test(u) || u.includes('webp')) {
      if (await download(u, path.join(OUT_INV, 'felicity-hybrid.jpg'), 5000)) {
        felicityOk = true;
        break;
      }
    }
  }
}

// --- Tensite from AutoSolar product page ---
const tensitePages = [
  'https://autosolar.co/inversores-cargadores-48v/inversor-cargador-6500w-48v-tensite-max',
  'https://autosolar.co/3004117-inversor-cargador-6500w-48v-tensite-max',
];
let tensiteOk = false;
for (const page of tensitePages) {
  const html = await getHtml(page);
  const imgs = extractImgs(html, 'https://autosolar.co').filter((u) =>
    /cdn\.autosolar|3004117|tensite|inversor/i.test(u)
  );
  console.log('tensite imgs', imgs.slice(0, 20));
  // Prefer non-thumb, non-kit
  const ranked = imgs
    .filter((u) => !/thumb|kit-|panel|bateria|gel|pylon/i.test(u))
    .sort((a, b) => {
      const score = (u) =>
        (/3004117/.test(u) ? 10 : 0) + (/tensite/i.test(u) ? 5 : 0) + (!/thumb/.test(u) ? 3 : 0);
      return score(b) - score(a);
    });
  for (const u of ranked) {
    const full = u.replace(/-thumb(?:2x)?\./, '.');
    if (await download(full, path.join(OUT_INV, 'tensite-inverter.jpg'), 10000)) {
      tensiteOk = true;
      break;
    }
  }
  if (tensiteOk) break;
}

// --- Studer from europe-solarstore / official ---
const studerPages = [
  'https://www.europe-solarstore.com/studer-sinus-inverter-xtm4000-48.html',
  'https://www.europe-solarstore.com/studer-sinus-inverter-xtm3500-24.html',
  'https://www.europe-solarstore.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/s/t/studer_xtender_xtm.jpg',
];
let studerOk = false;
const studerDirect = [
  'https://www.europe-solarstore.com/media/catalog/product/s/t/studer_xtm.jpg',
  'https://www.europe-solarstore.com/media/catalog/product/s/t/studer_xtender.jpg',
  'https://www.europe-solarstore.com/media/catalog/product/x/t/xtm4000.jpg',
  'https://cdn.shop.krannich-solar.com/media/studer/xtender.jpg',
  'https://www.studer-innotec.com/media/images/products/xtender-xtm.png',
  'https://www.studer-innotec.com/assets/images/products/xtm.png',
];
for (const u of studerDirect) {
  if (await download(u, path.join(OUT_INV, 'studer-xtender.jpg'), 8000)) {
    studerOk = true;
    break;
  }
}
if (!studerOk) {
  for (const page of studerPages) {
    if (!page.includes('.html')) continue;
    const html = await getHtml(page);
    const imgs = extractImgs(html, 'https://www.europe-solarstore.com');
    console.log('studer imgs', imgs.slice(0, 20));
    for (const u of imgs.filter((x) => /studer|xtm|xtender|catalog\/product/i.test(x))) {
      if (await download(u, path.join(OUT_INV, 'studer-xtender.jpg'), 8000)) {
        studerOk = true;
        break;
      }
    }
    if (studerOk) break;
  }
}

// --- Better Soluna: try shopify product gallery JSONs / alternate files ---
const solunaCandidates = [
  'https://cdn.shopify.com/s/files/1/0740/6501/9155/files/Soluna_10K_Pack_HV-1.jpg',
  'https://cdn.shopify.com/s/files/1/0740/6501/9155/files/Soluna_10K_Pack_HV.jpg',
  'https://cdn.shopify.com/s/files/1/0740/6501/9155/files/Soluna_10K_Pack_HV-2.jpg',
  'https://cdn.shopify.com/s/files/1/0740/6501/9155/products/Soluna_10K_Pack_HV-1.jpg',
];
const solHtml = await getHtml(
  'https://www.self2solar.com/products/soluna-battery-module-10k-15k-pack-hv-10-15kwh-268-8-384v-ul1973-ul9540a'
);
const solImgs = extractImgs(solHtml, 'https://www.self2solar.com').filter((u) =>
  /soluna|shopify/i.test(u)
);
console.log('soluna page imgs', solImgs.slice(0, 15));
for (const u of [...solunaCandidates, ...solImgs]) {
  // Prefer product photos over datasheet-looking files if larger pure shots exist
  if (await download(u, path.join(OUT_BAT, 'soluna-battery.jpg'), 12000)) {
    // keep first good; if specs sheet, try next for larger product-only
    const size = fs.statSync(path.join(OUT_BAT, 'soluna-battery.jpg')).size;
    if (size > 40000 && !/spec|datasheet|tech/i.test(u)) break;
    // if this was the known good Soluna_10K, accept it
    if (/Soluna_10K_Pack_HV-1/i.test(u)) break;
  }
}

console.log('\n=== sizes ===');
for (const f of [
  'felicity-hybrid.jpg',
  'tensite-inverter.jpg',
  'studer-xtender.jpg',
].map((x) => path.join(OUT_INV, x))) {
  console.log(path.basename(f), fs.existsSync(f) ? fs.statSync(f).size : 'MISSING');
}
for (const f of ['huawei-luna.jpg', 'soluna-battery.jpg'].map((x) => path.join(OUT_BAT, x))) {
  console.log(path.basename(f), fs.existsSync(f) ? fs.statSync(f).size : 'MISSING');
}
