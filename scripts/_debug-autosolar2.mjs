import fs from 'node:fs';

const html = fs.readFileSync('imagenes-proveedores/_debug-autosolar.html', 'utf8');
const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
const prods = [
  ...new Set(
    hrefs
      .map((u) => u.split('?')[0].replace(/\/$/, ''))
      .filter((u) => /^https?:\/\/(?:www\.)?autosolar\.co\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(u))
      .filter(
        (u) =>
          !/\/(blog|cart|login|register|contacto|horario|forgot|categoria|category|tag|page|author)\b/i.test(
            u
          )
      )
  ),
];
console.log(prods.slice(0, 30).join('\n'));
console.log('count', prods.length);

// Also check image URLs on a product page
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const prod = prods.find((u) => /pylon/i.test(u)) || prods[0];
console.log('fetching', prod);
const res = await fetch(prod, { headers: { 'User-Agent': UA } });
const ph = await res.text();
fs.writeFileSync('imagenes-proveedores/_debug-autosolar-prod.html', ph);
const imgs = [
  ...new Set(
    [...ph.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:png|jpe?g|webp)/gi)].map((m) =>
      m[0].replace(/-thumb(?=\.)/i, '')
    )
  ),
].filter((u) => /uploads|wp-content/i.test(u) && !/logo|icon|banner/i.test(u));
console.log('imgs', imgs.slice(0, 10));
