import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  return { status: res.status, final: res.url, html: await res.text() };
}

const cats = [
  'https://autosolar.co/controladores-de-carga-mppt',
  'https://autosolar.co/controladores-de-carga-pwm',
  'https://autosolar.co/inversores-cargadores',
  'https://autosolar.co/inversores-cargadores-12v',
  'https://autosolar.co/inversores-cargadores-24v',
  'https://autosolar.co/inversores-cargadores-48v',
  'https://autosolar.co/baterias-de-litio',
  'https://autosolar.co/baterias-de-litio-48v',
  'https://autosolar.co/baterias-de-litio-12v',
  'https://autosolar.co/inversores-on-grid',
  'https://autosolar.co/inversores-on-grid-monofasicos',
  'https://autosolar.co/inversores-on-grid-trifasicos',
  'https://autosolar.co/paneles-solares-24v',
  'https://autosolar.co/microinversores',
];

const all = new Map();
for (const cat of cats) {
  const { status, final, html } = await fetchHtml(cat);
  const title = (html.match(/<title>([^|<]+)/i) || [])[1]?.trim()?.slice(0, 60);
  const hrefs = [
    ...new Set(
      [...html.matchAll(/href="([^"]+)"/gi)]
        .map((m) => m[1].split('?')[0].replace(/\/$/, ''))
        .filter((u) => /^https?:\/\/(?:www\.)?autosolar\.co\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(u))
        .filter((u) => !/kit|busqueda|fabricantes|blog|account|cart/i.test(u))
    ),
  ];
  // filter to products under this category path
  const catSlug = cat.split('/').pop();
  const inCat = hrefs.filter((u) => u.includes(`/${catSlug}/`) || /victron|growatt|pylon|tensite|ja-solar|smartsolar|multiplus|phoenix|quattro/i.test(u));
  console.log(status, catSlug, 'title=', title, 'links=', hrefs.length, 'relevant=', inCat.length);
  for (const u of inCat) all.set(u, cat);
  // pagination?
  const pages = [...html.matchAll(/[?&]page=(\d+)/gi)].map((m) => Number(m[1]));
  if (pages.length) console.log('  pages', Math.max(...pages));
  await new Promise((r) => setTimeout(r, 1000));
}

const victron = [...all.keys()].filter((u) => /victron|smartsolar|multiplus|phoenix|quattro|bluesolar/i.test(u));
console.log('\nVictron-ish', victron.length);
console.log(victron.slice(0, 30).join('\n'));
fs.writeFileSync(
  'imagenes-proveedores/_autosolar-index-sample.json',
  JSON.stringify({ total: all.size, victron, all: [...all.keys()] }, null, 2)
);
