import fs from 'fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function get(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
  });
  console.log('GET', r.status, url);
  if (!r.ok) return '';
  return await r.text();
}

function extractImgs(html) {
  const out = new Set();
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/gi)) {
    out.add(m[0].replace(/&amp;/g, '&'));
  }
  for (const m of html.matchAll(/["'](\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi)) {
    out.add(m[1]);
  }
  return [...out].filter(
    (x) => !/logo|icon|sprite|favicon|banner|facebook|twitter|payment|flag|avatar|cart|whatsapp/i.test(x)
  );
}

const pages = [
  'https://www.felicitysolar.com/ph/product/ivem5048/',
  'https://us.felicitysolar.com/product/ivem5048-lv/',
  'https://www.felicitysolar.com/product/ivem3-5kw-lv/',
  'https://tamsolec.com/product/ivem5048-5kw-hybrid-inverter-48v-with-built-in-100a-mppt/',
  'https://www.studer-innotec.com/en/products/xtender-series/',
  'https://www.europe-solarstore.com/studer-xtender-xtm-4000-48.html',
  'https://www.krannich-solar.com/en/products/studer-xtender-xtm-4000-48',
  'https://autosolar.co/3004117-inversor-cargador-off-grid-tensite-6500w',
  'https://autosolar.co/busqueda?controller=search&s=3004117',
  'https://www.self2solar.com/products/soluna-battery-module-10k-15k-pack-hv-10-15kwh-268-8-384v-ul1973-ul9540a',
];

for (const u of pages) {
  const html = await get(u);
  const imgs = extractImgs(html).slice(0, 20);
  console.log('\n===', u, 'count', imgs.length);
  for (const x of imgs) console.log(x.slice(0, 200));
  fs.writeFileSync(
    `scripts/_tmp-page-${Buffer.from(u).toString('base64url').slice(0, 24)}.html`,
    html.slice(0, 200000)
  );
}
