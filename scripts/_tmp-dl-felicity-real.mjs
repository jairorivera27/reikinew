import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(
  root,
  'public',
  'images',
  'productos-tienda',
  'paneles-solares',
  'felicity-panel-mono.jpg'
);
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer || url },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error('small ' + buf.length);
  if (/<!DOCTYPE|<html/i.test(buf.slice(0, 80).toString('utf8'))) throw new Error('html');
  return buf;
}

const pages = [
  'https://autosolar.co/busqueda?controller=search&s=felicity+panel',
  'https://autosolar.co/busqueda?controller=search&s=3004613',
  'https://latam.felicitysolar.com/',
];

for (const p of pages) {
  try {
    const html = await (await fetch(p, { headers: { 'User-Agent': UA } })).text();
    const imgs = [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)]
      .map((m) => m[0])
      .filter((u) => /panel|solar|felicity|30046|gk-1|msd/i.test(u));
    console.log('\n', p);
    console.log([...new Set(imgs)].slice(0, 20).join('\n'));
  } catch (e) {
    console.log('page fail', p, e.message);
  }
}

const tries = [
  'https://latam.felicitysolar.com/wp-content/uploads/2024/07/1599722876470464514.webp',
  'https://www.felicitysolar.com/wp-content/uploads/2024/06/GK-1-72HTBD-580M-1.png',
  'https://www.felicitysolar.com/wp-content/uploads/2024/06/GK-1-72HTBD-580M.png',
  'https://cdn.shopify.com/s/files/1/0494/2577/6801/files/ja_solar_module.jpg', // last resort already have
];

for (const u of tries) {
  try {
    const buf = await download(u, 'https://www.felicitysolar.com/');
    // Prefer jpeg/png; if webp keep webp extension
    const out = u.endsWith('.webp') ? dest.replace(/\.jpg$/, '.webp') : dest;
    fs.writeFileSync(out, buf);
    console.log('SAVED', out, buf.length, u);
    if (out.endsWith('.webp')) {
      // point md to webp
      const md = path.join(
        root,
        'src',
        'content',
        'productos',
        'panel-solar-monocristalino-felicity-1kw-3004613.md'
      );
      let text = fs.readFileSync(md, 'utf8');
      text = text.replace(
        /^image:\s*".*?"/m,
        'image: "/images/productos-tienda/paneles-solares/felicity-panel-mono.webp"'
      );
      fs.writeFileSync(md, text);
    }
    break;
  } catch (e) {
    console.warn('fail', u, e.message);
  }
}
