import fs from 'fs';
import path from 'path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const out = 'public/images/productos-tienda/bombeo';
fs.mkdirSync(out, { recursive: true });

async function dl(url, dest, min = 10000) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'image/*,*/*',
        Referer: new URL(url).origin + '/',
      },
      redirect: 'follow',
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const ok =
      r.ok &&
      buf.length >= min &&
      (buf[0] === 0xff || (buf[0] === 0x89 && buf[1] === 0x50) || buf.toString('utf8', 0, 4) === 'RIFF');
    console.log(ok ? 'OK' : 'SKIP', path.basename(dest), r.status, buf.length);
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
  for (const m of html.matchAll(/(?:src|data-src|data-large_image|href)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)) {
    let u = m[1].split(/\s+/)[0].replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = new URL(page).origin + u;
    s.add(u);
  }
  return [...s];
}

// Replace wrong Sta-Rite with verified Connera KOLOSAL kit photo
await dl(
  'https://hidroshop.mx/wp-content/uploads/FOTO-27-5.jpg',
  path.join(out, 'kolos3-sumergible.jpg'),
  10000
);
fs.copyFileSync(path.join(out, 'kolos3-sumergible.jpg'), path.join(out, 'kolos4-sumergible.jpg'));

// Keep higher-quality CFP PNGs
await dl(
  'https://bombascoronado.com/wp-content/uploads/2025/06/kolos_cfp_750_72_ctrl.png',
  path.join(out, 'kolos-cfp-horizontal.png'),
  8000
);
await dl(
  'https://bombascoronado.com/wp-content/uploads/2025/06/kolos_cfp_750_72.png',
  path.join(out, 'kolos-cfp-pump-only.png'),
  8000
);

await dl(
  'https://hidroshop.mx/wp-content/uploads/KOLOSAL-POOL-1.jpg',
  path.join(out, 'kolos-pool.jpg'),
  10000
);

// Coronado KOLOS4 product gallery
const coronado = await imgs(
  'https://bombascoronado.com/producto/motobomba-sumergible-solar-1500-watts-430vcc-desc-2-connera-serie-kolosal/'
);
const relevant = coronado.filter((u) => /kolos|connera|wp-content\/uploads/i.test(u));
console.log('coronado imgs', relevant.slice(0, 20));
for (const u of relevant) {
  const full = u.replace(/-\d+x\d+\.(jpg|png|webp)/i, '.$1').replace(/\?.*$/, '');
  if (/logo|icon|banner|avatar/i.test(full)) continue;
  if (await dl(full, path.join(out, 'kolos4-from-coronado' + path.extname(full).split('?')[0]), 12000)) {
    break;
  }
}

// Search Coronado listing for more Kolosal product images
const search = await imgs('https://bombascoronado.com/?s=kolosal+sumergible');
console.log(
  'search',
  search.filter((u) => /kolos|connera/i.test(u)).slice(0, 25)
);

console.log('\n=== FINAL ===');
for (const f of fs.readdirSync(out).filter((x) => /kolos/i.test(x))) {
  console.log(f, fs.statSync(path.join(out, f)).size);
}
