import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const url =
  'https://autosolar.co/baterias-de-litio/bateria-litio-35kwh-pylontech-us3000-48v';
const html = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
fs.writeFileSync('imagenes-proveedores/_debug-us3000.html', html);

const og = (html.match(/property="og:image"\s+content="([^"]+)"/i) ||
  html.match(/content="([^"]+)"\s+property="og:image"/i) ||
  [])[1];
console.log('og', og);

// gallery section heuristics
const ids = [
  ...html.matchAll(/cdn\.autosolar\.co\/images\/(\d+)\//gi),
].map((m) => m[1]);
const freq = {};
for (const id of ids) freq[id] = (freq[id] || 0) + 1;
console.log('ids by freq', Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10));
