import fs from 'node:fs';

const html = fs.readFileSync('imagenes-proveedores/_debug-autosolar-prod.html', 'utf8');
console.log('len', html.length);
console.log('title', (html.match(/<title>([^<]+)/i) || [])[1]);
console.log('h1', (html.match(/<h1[^>]*>([^<]+)/i) || [])[1]);

// any img tags
const imgs = [...html.matchAll(/<img[^>]+>/gi)].slice(0, 20);
for (const m of imgs) {
  console.log('IMG:', m[0].slice(0, 200));
}

// data-src, srcset
const ds = [...html.matchAll(/data-src="([^"]+)"/gi)].map((m) => m[1]);
console.log('data-src', ds.slice(0, 15));
const src = [...html.matchAll(/\ssrc="([^"]+)"/gi)].map((m) => m[1]);
console.log('src sample', src.filter((u) => /\.(png|jpe?g|webp)/i.test(u)).slice(0, 15));
const abs = [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:png|jpe?g|webp)/gi)].map((m) => m[0]);
console.log('abs', abs.slice(0, 15));

// relative /storage or /media
const rel = [...html.matchAll(/(?:src|href|data-src)="(\/[^"]+\.(?:png|jpe?g|webp))"/gi)].map(
  (m) => m[1]
);
console.log('rel', rel.slice(0, 15));
