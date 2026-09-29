import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inv = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const bat = path.join(root, 'public', 'images', 'productos-tienda', 'baterias');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer || url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 30000) throw new Error('small ' + buf.length);
  const hex = buf.slice(0, 8).toString('hex');
  if (!/^ffd8ff|^89504e47|^52494646/i.test(hex)) throw new Error('not image');
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url.slice(0, 130));
  return buf.length;
}

async function html(page) {
  return (await fetch(page, { headers: { 'User-Agent': UA } })).text();
}

function imgs(htmlText) {
  return [
    ...new Set(
      [...htmlText.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) =>
        m[0].replace(/&amp;/g, '&')
      )
    ),
  ];
}

// --- SOLUNA from RENVU / self2solar: prefer large product media ---
{
  const dest = path.join(bat, 'soluna-battery.jpg');
  const pages = [
    'https://www.renvu.com/products/soluna-10kwh-hv-lfp-battery',
    'https://www.self2solar.com/products/soluna-battery-module-10k-15k-pack-hv-10-15kwh-268-8-384v-ul1973-ul9540a',
  ];
  let ok = false;
  for (const p of pages) {
    const list = imgs(await html(p)).filter(
      (u) =>
        /cdn\.shopify|files\/|products\//i.test(u) &&
        !/logo|icon|banner|favicon|review|star/i.test(u)
    );
    // Prefer larger named files / non-thumb
    list.sort((a, b) => (b.includes('width=') ? -1 : 1));
    console.log('soluna', p, list.slice(0, 8));
    for (const u of list) {
      // try width variants
      const candidates = [u];
      if (u.includes('width=')) candidates.push(u.replace(/width=\d+/, 'width=1200'));
      if (u.includes('_compact')) candidates.push(u.replace('_compact', ''));
      for (const c of candidates) {
        try {
          await download(c, dest, p);
          ok = true;
          break;
        } catch {
          /* next */
        }
      }
      if (ok) break;
    }
    if (ok) break;
  }
  if (!ok) console.warn('soluna FAIL');
}

// --- HUAWEI LUNA: krannich product detail if possible + enlarge ---
{
  const dest = path.join(bat, 'huawei-luna.jpg');
  const pages = [
    'https://shop.krannich-solar.com/de-en/search?search=LUNA2000-5-E0',
    'https://shop.krannich-solar.com/de-en/search?search=LUNA2000',
  ];
  let ok = false;
  for (const p of pages) {
    const list = imgs(await html(p)).filter((u) => /luna|01628|battery|speicher/i.test(u));
    console.log('huawei', p, list.length, list[0]);
    for (const u of list.slice(0, 15)) {
      try {
        // try higher res by stripping size suffix
        const hi = u.replace(/_\d+x\d+/, '').replace(/_det_/, '_');
        await download(hi !== u ? hi : u, dest, p);
        ok = true;
        break;
      } catch {
        try {
          await download(u, dest, p);
          ok = true;
          break;
        } catch {
          /* next */
        }
      }
    }
    if (ok) break;
  }
}

// --- STUDER: look for picture downloads / product photos on midsummer ---
{
  const dest = path.join(inv, 'studer-xtender.jpg');
  const pages = [
    'https://www.midsummerwholesale.co.uk/buy/studer-xtm-2600-48',
    'https://www.midsummerwholesale.co.uk/buy/studer-xtender-xtm-2600-48',
    'https://www.europe-solarstore.com/studer-xtender-xtm-4000-48.html',
    'https://www.europe-solarstore.com/studer-xtender-xtm-2600-48.html',
  ];
  let ok = false;
  for (const p of pages) {
    try {
      const list = imgs(await html(p)).filter(
        (u) => /studer|xtender|xtm|media|catalog|product/i.test(u) && !/pictos|icon|logo/i.test(u)
      );
      console.log('studer', p, list.length, list[0]);
      for (const u of list.slice(0, 20)) {
        try {
          await download(u, dest, p);
          ok = true;
          break;
        } catch {
          /* next */
        }
      }
    } catch (e) {
      console.warn(p, e.message);
    }
    if (ok) break;
  }
  if (!ok) {
    // keep previous krannich studer if we still have a decent one from earlier session - redownload krannich
    const p = 'https://shop.krannich-solar.com/de-en/search?search=xtender%20xtm';
    const list = imgs(await html(p)).filter((u) => /cdn\.shop\.krannich/i.test(u));
    for (const u of list.slice(0, 20)) {
      try {
        await download(u, dest, p);
        ok = true;
        break;
      } catch {
        /* next */
      }
    }
  }
}

// --- FELICITY inverter: product pages ---
{
  const dest = path.join(inv, 'felicity-hybrid.jpg');
  const pages = [
    'https://eu.felicitysolar.com/product/ivem5048/',
    'https://eu.felicitysolar.com/product/ivcm1048/',
    'https://us.felicitysolar.com/product/ivem5048/',
    'https://7sun.eu/en/search?s=IVEM',
    'https://www.renvu.com/search?q=felicity+inverter',
  ];
  let ok = false;
  for (const p of pages) {
    try {
      const list = imgs(await html(p)).filter(
        (u) =>
          /felicity|ivem|ivcm|inverter|wp-content|cdn|shopify/i.test(u) &&
          !/casas-para|cargador\.png|panda|logo|banner/i.test(u)
      );
      console.log('felicity', p, list.length, list.slice(0, 3));
      for (const u of list.slice(0, 25)) {
        try {
          await download(u, dest, p);
          ok = true;
          break;
        } catch {
          /* next */
        }
      }
    } catch (e) {
      console.warn(p, e.message);
    }
    if (ok) break;
  }
}

// --- TENSITE: only images under sku folder matching product ---
{
  const dest = path.join(inv, 'tensite-inverter.jpg');
  const search = await html('https://autosolar.co/busqueda?controller=search&s=3004117');
  // find product link
  const links = [...search.matchAll(/href="(\/[^"]*3004117[^"]*|\/inversores[^"]*tensite[^"]*)"/gi)].map(
    (m) => m[1]
  );
  console.log('tensite links', [...new Set(links)].slice(0, 10));
  const skuImgs = [
    ...search.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/3004117\/[^"'\\\s>]+/gi),
  ].map((m) => m[0]);
  console.log('sku imgs', skuImgs);
  let ok = false;
  for (const u of skuImgs) {
    const full = u.includes('-thumb') ? u.replace('-thumb', '') : u;
    try {
      await download(full.replace('-thumb2x', ''), dest, 'https://autosolar.co/');
      ok = true;
      break;
    } catch {
      try {
        await download(u, dest, 'https://autosolar.co/');
        ok = true;
        break;
      } catch {
        /* next */
      }
    }
  }
  if (!ok) {
    // browse product pages for tensite off-grid
    for (const p of [
      'https://autosolar.co/inversores-carga/inversor-cargador-6500w-48v-tensite',
      'https://autosolar.co/busqueda?controller=search&s=tensite+6500',
    ]) {
      try {
        const list = imgs(await html(p)).filter((u) => /cdn\.autosolar\.co\/images\/\d+\//i.test(u));
        for (const u of list) {
          if (/kit-|promo|banner|thumb/i.test(u) && !u.includes('tensite')) continue;
          if (!/tensite|inversor|6500|3004117/i.test(u) && list.length > 5) continue;
          try {
            await download(u.replace('-thumb2x', '').replace('-thumb', ''), dest, p);
            ok = true;
            break;
          } catch {
            /* next */
          }
        }
      } catch (e) {
        console.warn(p, e.message);
      }
      if (ok) break;
    }
  }
  if (!ok) console.warn('tensite FAIL');
}

console.log('DONE sizes');
for (const [dir, f] of [
  [inv, 'tensite-inverter.jpg'],
  [inv, 'studer-xtender.jpg'],
  [inv, 'felicity-hybrid.jpg'],
  [bat, 'huawei-luna.jpg'],
  [bat, 'soluna-battery.jpg'],
]) {
  const p = path.join(dir, f);
  console.log(f, fs.existsSync(p) ? fs.statSync(p).size : 'MISSING');
}
