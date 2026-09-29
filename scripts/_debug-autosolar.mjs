import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  console.log('status', res.status, url);
  const html = await res.text();
  console.log('len', html.length);
  return html;
}

const q = 'Pylontech UF5000';
const url = `https://autosolar.co/?s=${encodeURIComponent(q)}&post_type=product`;
const html = await fetchHtml(url);
fs.writeFileSync('imagenes-proveedores/_debug-autosolar.html', html);
const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
const interesting = hrefs.filter(
  (u) => /autosolar/i.test(u) && !/\.(css|js|png|jpg|svg|woff)/i.test(u)
);
console.log('interesting', interesting.slice(0, 40));
console.log('product-like', interesting.filter((u) => /producto|product|pylon|uf5000/i.test(u)).slice(0, 20));
