/**
 * Descarga HTML de Solaire y extrae URLs de imagen/PDF.
 * Uso: node scripts/_fetch-solaire-page.mjs <url>
 */
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/_fetch-solaire-page.mjs <url>');
  process.exit(1);
}

const res = await fetch(url, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml',
  },
});
const html = await res.text();
const out = path.join('docs', '_tmp-solaire-page.html');
fs.writeFileSync(out, html);

const urls = [
  ...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:png|jpe?g|webp|gif|pdf)/gi),
].map((m) => m[0].replace(/&amp;/g, '&'));
const uniq = [...new Set(urls)];

function stripSize(u) {
  return u.replace(/-\d+x\d+(?=\.(?:png|jpe?g|webp))/i, '');
}

const imgs = uniq.filter((u) => /\.(png|jpe?g|webp)/i.test(u));
const pdfs = uniq.filter((u) => /\.pdf/i.test(u));
const fullImgs = [...new Set(imgs.map(stripSize))];

console.log(JSON.stringify({ status: res.status, htmlLen: html.length, fullImgs, pdfs, thumbs: imgs.slice(0, 20) }, null, 2));
