import fs from 'fs';
import path from 'path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const out = 'public/images/productos-tienda/bombeo';

async function dl(url, dest, min = 10000) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: new URL(url).origin + '/' },
      redirect: 'follow',
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const ok =
      r.ok &&
      buf.length >= min &&
      (buf[0] === 0xff || (buf[0] === 0x89 && buf[1] === 0x50) || buf.toString('utf8', 0, 4) === 'RIFF');
    console.log(ok ? 'OK' : 'SKIP', path.basename(dest), r.status, buf.length, url.slice(0, 100));
    if (ok) fs.writeFileSync(dest, buf);
    return ok;
  } catch (e) {
    console.log('FAIL', path.basename(dest), e.message);
    return false;
  }
}

async function imgs(page) {
  const r = await fetch(page, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
  console.log('PAGE', r.status, page);
  if (!r.ok) return [];
  const html = await r.text();
  const s = new Set();
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/gi)) {
    s.add(m[0].replace(/&amp;/g, '&'));
  }
  return [...s];
}

const urls = [
  'https://bombascoronado.com/?s=kolos3',
  'https://bombascoronado.com/?s=kolos+mp',
  'https://bombascoronado.com/?s=kol4',
  'https://bombascoronado.com/?s=multipower+kolosal',
  'https://hidroshop.mx/?s=kolosal+3&post_type=product',
  'https://www.altamirawater.com/kolos4-60-150-20.html',
];

const found = new Set();
for (const u of urls) {
  const list = await imgs(u);
  for (const img of list) {
    if (/kolos|connera|FOTO-27|FOTO-2-|KOLOSAL/i.test(img) && !/logo|icon|cropped|avatar/i.test(img)) {
      found.add(img.replace(/\?.*$/, ''));
    }
  }
}
console.log('FOUND', [...found].slice(0, 40));

const targets = [
  ['https://bombascoronado.com/wp-content/uploads/2025/05/kolos4-60-150-11_1.jpg', 'kolos4-sumergible.jpg'],
  ['https://bombascoronado.com/wp-content/uploads/2025/05/kolosx-0-83-150-4__-300-10_b.jpg', 'kolos-mp-sumergible.jpg'],
];

for (const [url, name] of targets) {
  await dl(url, path.join(out, name), 10000);
}

// Prefer Coronado KOLOS4 as canonical for 4"
if (fs.existsSync(path.join(out, 'kolos4-from-coronado.jpg'))) {
  fs.copyFileSync(path.join(out, 'kolos4-from-coronado.jpg'), path.join(out, 'kolos4-sumergible.jpg'));
  console.log('copied coronado -> kolos4-sumergible.jpg');
}

// Look for KOLOS3 specific on coronado search results by fetching product links
const searchHtml = await (
  await fetch('https://bombascoronado.com/?s=kolos3', { headers: { 'User-Agent': UA } })
).text();
const productLinks = [...searchHtml.matchAll(/https?:\/\/bombascoronado\.com\/producto\/[^"'\\\s>]+/gi)].map(
  (m) => m[0]
);
console.log('product links', [...new Set(productLinks)].slice(0, 15));
for (const link of [...new Set(productLinks)].slice(0, 8)) {
  const list = await imgs(link);
  const good = list.filter((x) => /uploads\/202[0-9].*kolos/i.test(x) && !/\d+x\d+/.test(x));
  console.log(link.slice(0, 90), good.slice(0, 5));
  for (const g of good) {
    const base = path.basename(g.split('?')[0]);
    if (/kolos3|kolos_3|3_/i.test(base) || /kolos3/i.test(link)) {
      await dl(g.split('?')[0], path.join(out, 'kolos3-from-coronado.jpg'), 12000);
    }
    if (/mp|multipower|kol4/i.test(base) || /multipower|mp/i.test(link)) {
      await dl(g.split('?')[0], path.join(out, 'kolos-mp-sumergible.jpg'), 12000);
    }
  }
}
