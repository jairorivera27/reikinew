import fs from 'fs';
import path from 'path';

const dir = 'src/content/productos';
const files = fs.readdirSync(dir).filter((f) => f.startsWith('bomba-solar-') && f.endsWith('.md'));

function pickImage(slug) {
  if (/pool/i.test(slug)) return '/images/productos-tienda/bombeo/kolos-pool.jpg';
  if (/cfp/i.test(slug)) return '/images/productos-tienda/bombeo/kolos-cfp-horizontal.png';
  if (/kolos3|kol3/i.test(slug)) return '/images/productos-tienda/bombeo/kolos3-sumergible.jpg';
  if (/kolos4/i.test(slug)) return '/images/productos-tienda/bombeo/kolos4-sumergible.jpg';
  // Multipower KOL4-*-MP share same 4" family look
  if (/kol4|kolos.*mp|-mp/i.test(slug)) return '/images/productos-tienda/bombeo/kolos4-sumergible.jpg';
  return '/images/productos-tienda/bombeo/kolos3-sumergible.jpg';
}

for (const f of files) {
  const p = path.join(dir, f);
  let text = fs.readFileSync(p, 'utf8');
  const img = pickImage(f);
  if (!/^image:\s*/m.test(text)) {
    console.log('NO IMAGE FIELD', f);
    continue;
  }
  const next = text.replace(/^image:\s*.*$/m, `image: "${img}"`);
  if (next !== text) {
    fs.writeFileSync(p, next);
    console.log('UPD', f, '->', img);
  } else {
    console.log('SAME', f, img);
  }
}

// Cleanup wrong legacy files
const bombeo = 'public/images/productos-tienda/bombeo';
for (const junk of [
  'kolos-bomba-solar.jpg',
  'kolos-cfp-horizontal.jpg', // superseded by png (was tiny/wrong ext)
  '_tmp-foto216.jpg',
  'kolos-pool-alt.jpg',
  'kolos4-from-coronado.jpg', // already copied to kolos4-sumergible
  'kolos-cfp-pump-only.png',
  'kolos-mp-sumergible.jpg', // KOLOSX not Multipower; avoid confusion
]) {
  const jp = path.join(bombeo, junk);
  if (fs.existsSync(jp)) {
    fs.unlinkSync(jp);
    console.log('DEL', junk);
  }
}

console.log('\nAssets kept:');
for (const f of fs.readdirSync(bombeo).filter((x) => /kolos/i.test(x))) {
  console.log(f, fs.statSync(path.join(bombeo, f)).size);
}
