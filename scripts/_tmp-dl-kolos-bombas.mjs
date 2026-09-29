import fs from 'fs';
import path from 'path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const out = 'public/images/productos-tienda/bombeo';
fs.mkdirSync(out, { recursive: true });

const BAD =
  /logo|icon|sprite|favicon|banner|facebook|twitter|cart|payment|placeholder|avatar|woocommerce|gravatar/i;

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
    const ok =
      r.ok &&
      buf.length >= minBytes &&
      (buf[0] === 0xff || (buf[0] === 0x89 && buf[1] === 0x50) || buf.toString('utf8', 0, 4) === 'RIFF');
    console.log(ok ? 'OK' : 'SKIP', path.basename(dest), r.status, buf.length, url.slice(0, 100));
    if (!ok) return false;
    fs.writeFileSync(dest, buf);
    return true;
  } catch (e) {
    console.log('FAIL', path.basename(dest), e.message);
    return false;
  }
}

async function imgsFrom(page) {
  const r = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
  console.log('PAGE', r.status, page);
  if (!r.ok) return [];
  const html = await r.text();
  const outSet = new Set();
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/gi)) {
    outSet.add(m[0].replace(/&amp;/g, '&'));
  }
  for (const m of html.matchAll(/(?:src|data-src|data-large_image|data-thumb|href)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)) {
    let u = m[1].split(/\s+/)[0].replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = new URL(page).origin + u;
    outSet.add(u);
  }
  // wp-json / woocommerce gallery
  for (const m of html.matchAll(/"full_src":"(https?:\\\/\\\/[^"]+)"/gi)) {
    outSet.add(m[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&'));
  }
  return [...outSet].filter((u) => !BAD.test(u));
}

async function saveBest(pages, destName, preferRe, min = 15000) {
  const dest = path.join(out, destName);
  for (const page of pages) {
    const imgs = await imgsFrom(page);
    const ranked = imgs.sort((a, b) => {
      const score = (u) =>
        (preferRe && preferRe.test(u) ? 12 : 0) +
        (/wp-content\/uploads|product|kolos|connera|bomba|motobomba|woocommerce/i.test(u) ? 6 : 0) +
        (!/thumb|-\d+x\d+\.|icon|logo/i.test(u) ? 3 : -5);
      return score(b) - score(a);
    });
    console.log(' top', destName, ranked.slice(0, 8));
    for (const u of ranked.slice(0, 15)) {
      const full = u.replace(/-\d+x\d+\.(jpg|png|webp)/i, '.$1').replace(/-thumb(?:2x)?\./, '.');
      if (await download(full, dest, min)) return true;
    }
  }
  return false;
}

// Remove wrong Shurflo image
const old = path.join(out, 'kolos-bomba-solar.jpg');
if (fs.existsSync(old)) {
  fs.unlinkSync(old);
  console.log('DEL old shurflo image');
}

const jobs = [
  {
    name: 'kolos3-sumergible.jpg',
    pages: [
      'https://hidroshop.mx/producto/motobomba-solar-sumergible-serie-kolosal-diametro-3-y-750-w-de-potencia/',
      'https://hidroshop.mx/producto/motobomba-solar-sumergible-serie-kolosal-diametro-3-y-1100-w-de-potencia/',
      'https://hidroshop.mx/producto/motobomba-solar-sumergible-serie-kolosal-diametro-3-y-600-w-de-potencia/',
    ],
    prefer: /kolos|kolosal|connera|motobomba|bomba|sumergible/i,
  },
  {
    name: 'kolos4-sumergible.jpg',
    pages: [
      'https://hidroshop.mx/producto/motobomba-solar-sumergible-serie-kolosal-diametro-4-y-1500-w-de-potencia/',
      'https://hidroshop.mx/producto/motobomba-solar-sumergible-serie-kolosal-diametro-4-y-1300-w-de-potencia/',
      'https://hidroshop.mx/?s=kolosal+4&post_type=product',
    ],
    prefer: /kolos|kolosal|connera|motobomba|4/i,
  },
  {
    name: 'kolos-cfp-horizontal.jpg',
    pages: [
      'https://bombascoronado.com/producto/motobomba-centrifuga-horizontal-para-bombeo-solar-750w-2-x-2-serie-kolosal-cfp/',
      'https://www.altamirawater.com/kolos-cfp-750-72.html',
      'https://www.cobosa.com.mx/producto/motobomba-centrifuga-solar-kolos-cfp750/',
    ],
    prefer: /cfp|kolos|centrifuga|connera|product/i,
  },
  {
    name: 'kolos-pool.jpg',
    pages: [
      'https://hidroshop.mx/?s=kolos+piscina&post_type=product',
      'https://bombascoronado.com/?s=pool+kolos',
      'https://www.altamirawater.com/catalogsearch/result/?q=kolos+pool',
    ],
    prefer: /pool|piscina|kolos|bomba/i,
  },
];

for (const job of jobs) {
  await saveBest(job.pages, job.name, job.prefer);
}

// Extra: scrape HidroShop category listing for Kolosal
const cat = await imgsFrom('https://hidroshop.mx/categoria-producto/motobombas-solares-sumergibles/');
console.log('category imgs', cat.filter((u) => /kolos|connera|motobomba/i.test(u)).slice(0, 20));
for (const u of cat.filter((x) => /kolos|connera|motobomba|sumergible/i.test(x))) {
  const dest3 = path.join(out, 'kolos3-sumergible.jpg');
  if (!fs.existsSync(dest3) || fs.statSync(dest3).size < 20000) {
    if (await download(u.replace(/-\d+x\d+\./, '.'), dest3, 15000)) break;
  }
}

console.log('\n=== FINAL ===');
for (const f of fs.readdirSync(out)) {
  console.log(f, fs.statSync(path.join(out, f)).size);
}
