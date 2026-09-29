import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'images', 'productos-tienda', 'protecciones');
fs.mkdirSync(outDir, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const BAD =
  /colombia-map|logo|icon|sprite|favicon|banner|facebook|twitter|payment|flag|avatar|cart|whatsapp|seguridad|grantia|envio\/|kit-/i;

async function download(url, dest, minBytes = 20000) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'image/avif,image/webp,image/*,*/*',
        Referer: new URL(url).origin + '/',
      },
      redirect: 'follow',
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const head = buf.slice(0, 4);
    const isImg =
      head[0] === 0xff ||
      (head[0] === 0x89 && head[1] === 0x50) ||
      head.toString('utf8') === 'RIFF';
    if (!r.ok || buf.length < minBytes || !isImg) {
      console.log('SKIP', r.status, buf.length, url.slice(0, 130));
      return false;
    }
    // Reject identical map-sized junk
    if (buf.length === 54077 || buf.length === 35078) {
      console.log('SKIP known junk size', buf.length);
      return false;
    }
    fs.writeFileSync(dest, buf);
    console.log('OK', path.basename(dest), buf.length, url.slice(0, 100));
    return true;
  } catch (e) {
    console.log('FAIL', e.message);
    return false;
  }
}

async function imgsFromPage(pageUrl) {
  const r = await fetch(pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
  console.log('PAGE', r.status, pageUrl);
  if (!r.ok) return [];
  const html = await r.text();
  const out = new Set();
  for (const m of html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/\d+\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi)) {
    out.add(m[0].replace(/&amp;/g, '&').replace(/-thumb(?:2x)?\./, '.'));
  }
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/gi)) {
    out.add(m[0].replace(/&amp;/g, '&'));
  }
  for (const m of html.matchAll(/(?:src|data-src|data-image|data-zoom-image|content)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)) {
    let u = m[1].split(/\s+/)[0].replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = new URL(pageUrl).origin + u;
    out.add(u);
  }
  // odoo /web/image/
  for (const m of html.matchAll(/(\/web\/image\/[^"'\\\s>]+)/gi)) {
    out.add(new URL(pageUrl).origin + m[1]);
  }
  return [...out].filter((u) => !BAD.test(u));
}

async function saveBest(pages, destName, preferRe) {
  const dest = path.join(outDir, destName);
  for (const page of pages) {
    const imgs = await imgsFromPage(page);
    const ranked = imgs.sort((a, b) => {
      const score = (u) =>
        (preferRe && preferRe.test(u) ? 10 : 0) +
        (/cdn\.autosolar\.co\/images\/\d+\//i.test(u) ? 8 : 0) +
        (/web\/image|product|breaker|dps|suntree|fuse|switch|spd|mcb/i.test(u) ? 4 : 0) +
        (!/thumb|map|colombia/i.test(u) ? 2 : -10);
      return score(b) - score(a);
    });
    console.log('top', destName, ranked.slice(0, 8));
    for (const u of ranked.slice(0, 12)) {
      if (await download(u, dest, 18000)) return true;
    }
  }
  return false;
}

// Delete junk 35078 files
for (const f of fs.readdirSync(outDir)) {
  const p = path.join(outDir, f);
  const sz = fs.statSync(p).size;
  if (sz === 35078 || sz === 54077) {
    fs.unlinkSync(p);
    console.log('DEL', f);
  }
}

const jobs = [
  {
    name: 'suntree-sl7n-dc.jpg',
    pages: [
      'https://autosolar.co/breakers-dc/breaker-solar-dc-2x16a-800v-suntree',
      'https://autosolar.co/breakers-dc/breaker-solar-dc-2x40a-800v-suntree',
      'https://autosolar.co/breakers-dc/breaker-solar-dc-2x25a-800v-suntree',
      'https://suntree.id/suntree-dc-mcb-sl7n-63/',
      'https://voltwise.ke/shop/suntree-sl7n-63-4p-1000vdc-miniature-circuit-breaker-522',
      'https://www.suntree-circuit-breaker.com/dc-circuit-breaker/sl7n-63-dc-circuit-breaker',
    ],
    prefer: /55041|breaker|sl7|suntree|mcb/i,
  },
  {
    name: 'suntree-spd-dc.jpg',
    pages: [
      'https://autosolar.co/descargador-de-sobretension/dps-solar-dc-2p-800vdc-2040ka-suntree',
      'https://autosolar.co/busqueda?controller=search&s=5504138',
    ],
    prefer: /5504138|dps|spd|suntree/i,
  },
  {
    name: 'suntree-spd-ac.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=dps+ac+suntree',
      'https://autosolar.co/descargador-de-sobretension',
    ],
    prefer: /dps|spd|sup1|suntree/i,
  },
  {
    name: 'suntree-scb8-ac.jpg',
    pages: [
      'https://autosolar.co/breakers?q=SCB8',
      'https://autosolar.co/busqueda?controller=search&s=breaker+ac+suntree+63a',
      'https://autosolar.co/breakers',
    ],
    prefer: /scb|breaker|ac|suntree|55041/i,
  },
  {
    name: 'suntree-siso-dc.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=seccionador+dc+suntree',
      'https://autosolar.co/busqueda?controller=search&s=SISO-40',
    ],
    prefer: /siso|seccionador|isolator/i,
  },
  {
    name: 'suntree-sq8-switch.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=SQ8T+suntree',
      'https://autosolar.co/busqueda?controller=search&s=switch+suntree+63a',
    ],
    prefer: /sq8|switch|rotativo/i,
  },
  {
    name: 'generic-pv-fuse.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=portafusible+10x38',
      'https://autosolar.co/busqueda?controller=search&s=fusible+solar+dc+15a',
    ],
    prefer: /fusible|fuse|portafusible|10x38/i,
  },
  {
    name: 'generic-mcb-ac.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=breaker+ac+63a+1p',
      'https://autosolar.co/breakers-ac',
    ],
    prefer: /breaker|63a|32a|magnetotermico/i,
  },
  {
    name: 'generic-mccb.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=breaker+250a+trifasico',
      'https://autosolar.co/busqueda?controller=search&s=caja+moldeada+250a',
    ],
    prefer: /250|400|mccb|moldeada/i,
  },
  {
    name: 'growatt-wifi.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=growatt+shinewifi-x',
      'https://autosolar.co/busqueda?controller=search&s=growatt+wifi',
    ],
    prefer: /wifi|shine|stick|dongle|growatt/i,
  },
  {
    name: 'citel-spd.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=citel',
      'https://www.citel.us/surge-protection-devices',
    ],
    prefer: /citel|ds50|ds70|spd/i,
  },
  {
    name: 'leader-breaker.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=breaker+leader',
    ],
    prefer: /leader|breaker/i,
  },
  {
    name: 'leader-dps.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=dps+leader',
    ],
    prefer: /leader|dps/i,
  },
];

for (const job of jobs) {
  await saveBest(job.pages, job.name, job.prefer);
}

// Direct Voltwise Odoo image
await download(
  'https://voltwise.ke/web/image/product.template/522/image_1920?unique=4358996',
  path.join(outDir, 'suntree-sl7n-dc.jpg'),
  15000
);

console.log('\n=== FINAL ===');
for (const f of fs.readdirSync(outDir).sort()) {
  console.log(f.padEnd(36), fs.statSync(path.join(outDir, f)).size);
}
