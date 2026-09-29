import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const q = 'Victron SmartSolar';
const url = `https://autosolar.co/?s=${encodeURIComponent(q)}`;
const html = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
fs.writeFileSync('imagenes-proveedores/_debug-search-victron.html', html);
console.log('len', html.length);

// look for API hints
for (const pat of [/api[^"']+/gi, /algolia/gi, /search\.json/gi, /victron/gi, /smartsolar/gi, /wp-json/gi]) {
  const m = html.match(pat);
  if (m) console.log(pat, [...new Set(m)].slice(0, 8));
}

// try common endpoints
for (const u of [
  `https://autosolar.co/api/search?q=${encodeURIComponent(q)}`,
  `https://autosolar.co/search?q=${encodeURIComponent(q)}`,
  `https://cdn.autosolar.co/api/search?q=${encodeURIComponent(q)}`,
  `https://autosolar.co/wp-json/wp/v2/product?search=${encodeURIComponent(q)}`,
  `https://autosolar.co/wp-json/wc/store/products?search=${encodeURIComponent(q)}`,
]) {
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    const t = await res.text();
    console.log(res.status, u.slice(0, 80), t.slice(0, 120).replace(/\s+/g, ' '));
  } catch (e) {
    console.log('fail', u, e.message);
  }
}
