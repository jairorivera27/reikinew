import fs from 'node:fs';

const html = fs.readFileSync('imagenes-proveedores/_debug-us3000.html', 'utf8');
console.log('title', (html.match(/<title>([^|<]+)/i) || [])[1]);

// look for us3000 in image urls
const imgs = [
  ...html.matchAll(/https?:\/\/(?:cdn\.)?autosolar\.co\/images\/[^"'\\\s>]+/gi),
].map((m) => m[0]);
const us = imgs.filter((u) => /us3000|pylontech/i.test(u));
console.log('pylon/us3000 imgs', [...new Set(us)].slice(0, 20));

// meta tags
for (const m of html.matchAll(/<meta[^>]+>/gi)) {
  if (/image|og:|twitter/i.test(m[0])) console.log('meta', m[0].slice(0, 180));
}

// json-ld
for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
  const t = m[1].slice(0, 500);
  if (/image|Product/i.test(t)) console.log('ld', t);
}

// product gallery class
const gal = html.match(/product-gallery[\s\S]{0,2000}/i);
console.log('gal snippet', gal?.[0]?.slice(0, 800));
