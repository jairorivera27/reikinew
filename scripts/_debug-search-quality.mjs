const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
  console.log(res.status, res.url);
  return res.text();
}

async function search(q) {
  const url = `https://autosolar.co/?s=${encodeURIComponent(q)}`;
  const html = await fetchHtml(url);
  const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1].split('?')[0].replace(/\/$/, ''));
  const prods = [
    ...new Set(
      hrefs.filter(
        (u) =>
          /^https?:\/\/(?:www\.)?autosolar\.co\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(u) &&
          !/kit|fabricantes|account|blog|cart/i.test(u)
      )
    ),
  ];
  console.log('\nSEARCH', q);
  for (const u of prods.slice(0, 12)) console.log(' ', u);
  return prods;
}

for (const q of [
  'Pylontech US3000',
  'Victron SmartSolar MPPT 100/50',
  'Victron MultiPlus',
  'Growatt ARK',
]) {
  const urls = await search(q);
  if (!urls.length) continue;
  // pick best
  const best =
    urls.find((u) => new RegExp(q.split(/\s+/).slice(-1)[0], 'i').test(u)) || urls[0];
  const html = await fetchHtml(best);
  const title = (html.match(/<title>([^|<]+)/i) || [])[1]?.trim();
  console.log('BEST', best, 'TITLE', title);
  const imgs = [
    ...new Set(
      [...html.matchAll(/https?:\/\/cdn\.autosolar\.co\/images\/\d+\/[^"'\\\s>]+/gi)].map((m) =>
        m[0].replace(/-thumb2x|-thumb|-2x/gi, '')
      )
    ),
  ].filter((u) => !/kit|logo|seguridad|grantia|envio/i.test(u));
  console.log('IMGS', imgs.slice(0, 6));
}
