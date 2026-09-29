import fs from 'fs';

const UA = 'Mozilla/5.0';
const out = 'public/images/productos-tienda/protecciones';

async function dl(url, name) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: 'https://autosolar.co/' },
      redirect: 'follow',
    });
    const b = Buffer.from(await r.arrayBuffer());
    console.log(name, r.status, b.length);
    if (r.ok && b.length > 20000 && (b[0] === 0xff || b[0] === 0x89)) {
      fs.writeFileSync(`${out}/${name}`, b);
      return true;
    }
  } catch (e) {
    console.log('fail', name, e.message);
  }
  return false;
}

await dl(
  'https://cdn.autosolar.co/images/7102533/dps-solar-ac-2p-240vac-2040ka-moreday-68839bbbd588f.jpg',
  'suntree-spd-ac.jpg'
);
await dl(
  'https://cdn.autosolar.co/images/5504185/breaker-de-riel-ac-1x20a-230v-6ka-lumek-685dcf20070c8.jpg',
  'generic-mcb-ac.jpg'
);
await dl('https://cdn.autosolar.co/images/5504180/5504180.jpg', 'generic-mccb.jpg');
await dl('https://cdn.autosolar.co/images/7102511/7102511.jpg', 'generic-mccb-alt.jpg');

const page =
  'https://autosolar.co/accesorios-de-inversores/monitorizacion-growatt-shine-wifi-x';
const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
const imgs = [
  ...html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/3202018\/[^"'\\\s>]+/gi),
].map((m) => m[0].replace(/-thumb(?:2x)?\./, '.'));
console.log('growatt', [...new Set(imgs)]);
for (const u of [...new Set(imgs)]) {
  if (await dl(u, 'growatt-wifi.jpg')) break;
}
await dl(
  'https://cdn.autosolar.co/images/3202018/monitorizacion-growatt-shine-wifi-x.jpg',
  'growatt-wifi.jpg'
);

// If mccb still tiny, use abb
for (const name of ['generic-mcb-ac.jpg', 'generic-mccb.jpg']) {
  const p = `${out}/${name}`;
  if (!fs.existsSync(p) || fs.statSync(p).size < 40000) {
    const fallback =
      name === 'generic-mccb.jpg'
        ? `${out}/abb-breaker-dc-100a.png`
        : `${out}/suntree-scb8-ac.jpg`;
    if (fs.existsSync(fallback)) {
      fs.copyFileSync(fallback, p);
      console.log('fallback', name);
    }
  }
}

console.log('done sizes:');
for (const f of [
  'growatt-wifi.jpg',
  'suntree-spd-ac.jpg',
  'generic-mcb-ac.jpg',
  'generic-mccb.jpg',
  'generic-pv-fuse.jpg',
]) {
  const p = `${out}/${f}`;
  console.log(f, fs.existsSync(p) ? fs.statSync(p).size : 'missing');
}
