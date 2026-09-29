const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  console.log(res.status, url);
  return res.text();
}

const q = 'victron smartsolar mppt 100/50';
const url = `https://autosolar.co/busqueda?controller=search&s=${encodeURIComponent(q)}`;
const html = await fetchHtml(url);
const hrefs = [
  ...new Set(
    [...html.matchAll(/href="([^"]+)"/gi)]
      .map((m) => m[1].split('?')[0].replace(/\/$/, ''))
      .filter((u) => /^https?:\/\/(?:www\.)?autosolar\.co\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(u))
      .filter((u) => !/kit|busqueda|fabricantes|account/i.test(u))
  ),
];
console.log('products', hrefs.slice(0, 15));
const best = hrefs.find((u) => /smartsolar|victron|mppt/i.test(u)) || hrefs[0];
console.log('best', best);
if (best) {
  const ph = await fetchHtml(best);
  console.log('title', (ph.match(/<title>([^|<]+)/i) || [])[1]?.trim());
  const imgs = [
    ...new Set(
      [...ph.matchAll(/https?:\/\/cdn\.autosolar\.co\/images\/\d+\/[^"'\\\s>]+\.(?:png|jpe?g|webp)/gi)].map(
        (m) => m[0].replace(/-thumb2x|-thumb|-2x/gi, '')
      )
    ),
  ].filter((u) => !/kit|logo|seguridad|grantia|envio/i.test(u));
  // group by product id
  const byId = {};
  for (const u of imgs) {
    const id = (u.match(/\/images\/(\d+)\//) || [])[1];
    (byId[id] = byId[id] || []).push(u);
  }
  console.log(
    'byId',
    Object.entries(byId)
      .map(([id, arr]) => [id, arr.length, arr[0]])
      .slice(0, 5)
  );
}
