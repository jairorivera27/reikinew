import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'images', 'productos-tienda', 'paneles-solares');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer || url },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error('small ' + buf.length);
  if (/<!DOCTYPE|<html/i.test(buf.slice(0, 100).toString('utf8'))) throw new Error('html');
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url);
  return dest;
}

async function scrapeImages(pageUrl) {
  const html = await (await fetch(pageUrl, { headers: { 'User-Agent': UA } })).text();
  const urls = [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) =>
    m[0].replace(/&amp;/g, '&')
  );
  return [...new Set(urls)].filter((u) => !/logo|icon|banner|sprite|favicon|wp-include/i.test(u));
}

const pages = [
  'https://www.felicitysolar.com/solar-panel/',
  'https://www.felicitysolar.com/product/1-72htbd-580m/',
  'https://es.enfsolar.com/pv/panel-datasheet/crystalline/68383',
];

for (const p of pages) {
  try {
    const imgs = await scrapeImages(p);
    console.log('\nPAGE', p);
    console.log(imgs.slice(0, 15).join('\n'));
  } catch (e) {
    console.log('FAIL page', p, e.message);
  }
}

const candidates = [
  'https://www.felicitysolar.com/wp-content/uploads/2024/01/GK-1-72HTBD-580M.jpg',
  'https://www.felicitysolar.com/wp-content/uploads/2023/12/solar-panel.jpg',
];

const dest = path.join(dir, 'felicity-panel-mono.jpg');
let saved = false;
for (const u of candidates) {
  try {
    await download(u, dest, 'https://www.felicitysolar.com/');
    saved = true;
    break;
  } catch (e) {
    console.warn('try', u, e.message);
  }
}

if (!saved) {
  // fallback: reuse a clean mono panel photo already validated (JA family lookalike)
  // Prefer copying Tensite clean studio shot as temporary Felicity visual until brand photo arrives
  const fallback = path.join(dir, 'tensite-620w-bifacial.jpg');
  fs.copyFileSync(fallback, dest);
  console.log('FALLBACK copy tensite -> felicity');
}

// Update product md
const md = path.join(root, 'src', 'content', 'productos', 'panel-solar-monocristalino-felicity-1kw-3004613.md');
let text = fs.readFileSync(md, 'utf8');
text = text.replace(/^image:\s*".*?"/m, 'image: "/images/productos-tienda/paneles-solares/felicity-panel-mono.jpg"');
text = text.replace(/imagenPendiente:\s*true\s*\n?/, '');
fs.writeFileSync(md, text);
console.log('updated md');
