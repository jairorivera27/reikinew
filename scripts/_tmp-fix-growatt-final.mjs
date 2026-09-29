import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inv = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*', Referer: referer || url },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 25000) throw new Error('small ' + buf.length);
  // reject if looks like tiny logo-ish after save we'll visually check; skip untitled_design/solux logo names
  if (/untitled_design|logo|solux(?!.*growatt)/i.test(url)) throw new Error('logo-like url');
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url.slice(0, 120));
  return true;
}

const pages = [
  'https://solux.energy/products/growatt-min-3000tl-xh',
  'https://solux.energy/collections/inverters',
  'https://www.midsummerwholesale.co.uk/buy/growatt-min-3000tl-xh',
  'https://www.europe-solarstore.com/growatt-min-3000tl-xh.html',
  'https://www.solaris-shop.com/growatt-min-3000tl-xh/',
];

for (const page of pages) {
  try {
    const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
    const urls = [
      ...new Set(
        [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) =>
          m[0].replace(/&amp;/g, '&')
        )
      ),
    ];
    console.log(page, urls.length);
    console.log(urls.slice(0, 10).join('\n'));
    for (const u of urls) {
      if (/logo|icon|banner|favicon|untitled|solux(?!.*min)|badge/i.test(u)) continue;
      if (!/growatt|min|tl-xh|inverter|product|cdn|files|media/i.test(u)) continue;
      try {
        await download(u, path.join(inv, 'growatt-min.jpg'), page);
        fs.copyFileSync(path.join(inv, 'growatt-min.jpg'), path.join(inv, 'growatt-mod.jpg'));
        console.log('copied to mod');
        process.exit(0);
      } catch (e) {
        console.warn('skip', e.message, u.slice(0, 80));
      }
    }
  } catch (e) {
    console.warn(page, e.message);
  }
}

// last resort: keep a real inverter photo (Must) rather than a logo
fs.copyFileSync(path.join(inv, 'must-pv.png'), path.join(inv, 'growatt-min.jpg'));
fs.copyFileSync(path.join(inv, 'must-pv.png'), path.join(inv, 'growatt-mod.jpg'));
console.log('FALLBACK must for growatt');
