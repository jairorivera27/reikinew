import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'images', 'productos-tienda', 'protecciones');
fs.mkdirSync(outDir, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, minBytes = 8000, referer) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'image/avif,image/webp,image/*,*/*',
        Referer: referer || new URL(url).origin + '/',
      },
      redirect: 'follow',
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const head = buf.slice(0, 200).toString('utf8');
    if (!r.ok || buf.length < minBytes || head.includes('<html') || head.includes('<!DOCTYPE')) {
      console.log('SKIP', r.status, buf.length, url.slice(0, 110));
      return false;
    }
    fs.writeFileSync(dest, buf);
    console.log('OK', path.basename(dest), buf.length, url.slice(0, 100));
    return true;
  } catch (e) {
    console.log('FAIL', e.message, url.slice(0, 100));
    return false;
  }
}

function extractImgs(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/gi)) {
    out.add(m[0].replace(/&amp;/g, '&'));
  }
  for (const m of html.matchAll(/(?:src|data-src|data-image|data-zoom-image|data-large_image)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)) {
    let u = m[1].split(/\s+/)[0].replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/') && base) u = base + u;
    out.add(u);
  }
  return [...out].filter(
    (x) => !/logo|icon|sprite|favicon|banner|facebook|twitter|payment|flag|avatar|cart|whatsapp|thumb2?x?\./i.test(x)
  );
}

async function scrapeFirstGood(pages, destName, preferRe, minBytes = 12000) {
  const dest = path.join(outDir, destName);
  if (fs.existsSync(dest) && fs.statSync(dest).size > minBytes) {
    console.log('KEEP', destName, fs.statSync(dest).size);
    return true;
  }
  for (const page of pages) {
    try {
      const r = await fetch(page, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        redirect: 'follow',
      });
      console.log('PAGE', r.status, page);
      if (!r.ok) continue;
      const html = await r.text();
      const base = new URL(page).origin;
      let imgs = extractImgs(html, base);
      if (preferRe) imgs = imgs.filter((u) => preferRe.test(u)).concat(imgs);
      // Prefer CDN product images
      const ranked = [...new Set(imgs)].sort((a, b) => {
        const score = (u) =>
          (/cdn\.autosolar|media\/catalog|wp-content\/uploads|alibaba|alicdn|suntree/i.test(u) ? 5 : 0) +
          (/breaker|mcb|spd|dps|fuse|switch|protec|siso|sl7|scb|sup2|victron|batteryprotect|citel/i.test(u)
            ? 4
            : 0) +
          (!/kit-|panel|inversor|bateria|lifestyle|banner/i.test(u) ? 2 : -5);
        return score(b) - score(a);
      });
      for (const u of ranked.slice(0, 15)) {
        const full = u.replace(/-thumb(?:2x)?\./, '.').replace(/-\d+x\d+\.(jpg|png|webp)/i, '.$1');
        if (await download(full, dest, minBytes, page)) return true;
      }
    } catch (e) {
      console.log('PAGE FAIL', page, e.message);
    }
  }
  return false;
}

// Copy existing ABB local assets into modern folder
const abbSrc = path.join(root, 'public', 'images', 'Productos tienda', 'Protección Electrica');
const abbMap = [
  ['Breaker DC 32a ABB Medellín.png', 'abb-breaker-dc-32a.png'],
  ['Breaker DC 63A ABB Medellín.png', 'abb-breaker-dc-63a.png'],
  ['Breaker DC 100A ABB Medellín.png', 'abb-breaker-dc-100a.png'],
  ['Breaker DC 100a con Portafusible ABB Medellín.png', 'abb-fuseholder-100a.png'],
];
for (const [from, to] of abbMap) {
  const src = path.join(abbSrc, from);
  const dest = path.join(outDir, to);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('COPY', to);
  }
}

// Direct known-good candidate URLs (tried first)
const direct = [
  // Victron Smart BatteryProtect
  [
    'victron-batteryprotect.jpg',
    [
      'https://www.victronenergy.com/upload/prodimages/BatteryProtect_12-24V-100A_Smart.png',
      'https://www.victronenergy.com/upload/documents/Manual-BatteryProtect-12-24V-100A-EN-NL-FR-DE-ES-SE-PT.pdf',
    ],
  ],
];

for (const [name, urls] of direct) {
  const dest = path.join(outDir, name);
  for (const u of urls) {
    if (!/\.(jpg|jpeg|png|webp)$/i.test(u)) continue;
    if (await download(u, dest, 5000)) break;
  }
}

const jobs = [
  {
    name: 'suntree-sl7n-dc.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=suntree+SL7N',
      'https://autosolar.co/busqueda?controller=search&s=breaker+dc+suntree',
      'https://www.suntree.com.cn/product/miniature-circuit-breaker.html',
    ],
    prefer: /sl7|breaker|mcb|dc/i,
  },
  {
    name: 'suntree-scb8-ac.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=suntree+SCB8',
      'https://autosolar.co/busqueda?controller=search&s=breaker+ac+suntree',
    ],
    prefer: /scb8|breaker|ac/i,
  },
  {
    name: 'suntree-sq8-switch.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=suntree+SQ8',
      'https://autosolar.co/busqueda?controller=search&s=switch+suntree',
    ],
    prefer: /sq8|switch|interruptor/i,
  },
  {
    name: 'suntree-siso-dc.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=suntree+SISO',
      'https://autosolar.co/busqueda?controller=search&s=seccionador+dc+suntree',
    ],
    prefer: /siso|seccionador|isolator/i,
  },
  {
    name: 'suntree-spd-dc.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=suntree+SUP2',
      'https://autosolar.co/busqueda?controller=search&s=dps+dc+suntree',
      'https://autosolar.co/busqueda?controller=search&s=supresor+suntree',
    ],
    prefer: /sup2|spd|dps|surge/i,
  },
  {
    name: 'suntree-spd-ac.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=suntree+SUP1H',
      'https://autosolar.co/busqueda?controller=search&s=dps+ac+suntree',
    ],
    prefer: /sup1|spd|dps|ac/i,
  },
  {
    name: 'generic-mcb-ac.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=breaker+ac+63a',
      'https://autosolar.co/busqueda?controller=search&s=interruptor+magnetotermico+1p',
    ],
    prefer: /breaker|mcb|magnetotermico/i,
  },
  {
    name: 'generic-mccb.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=breaker+250a',
      'https://autosolar.co/busqueda?controller=search&s=interruptor+caja+moldeada',
    ],
    prefer: /mccb|250|moldeada|caja/i,
  },
  {
    name: 'generic-pv-fuse.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=portafusible+dc+solar',
      'https://autosolar.co/busqueda?controller=search&s=fusible+gPV',
    ],
    prefer: /fusible|fuse|portafusible|gpv/i,
  },
  {
    name: 'leader-breaker.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=breaker+leader+dc',
      'https://autosolar.co/busqueda?controller=search&s=leader+63a+dc',
    ],
    prefer: /leader|breaker/i,
  },
  {
    name: 'leader-dps.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=dps+leader',
      'https://autosolar.co/busqueda?controller=search&s=supresor+leader',
    ],
    prefer: /leader|dps|spd/i,
  },
  {
    name: 'victron-batteryprotect.jpg',
    pages: [
      'https://www.victronenergy.com/battery_protect/smart-battery-protect',
      'https://autosolar.co/busqueda?controller=search&s=victron+batteryprotect',
      'https://www.europe-solarstore.com/victron-energy-smart-batteryprotect-12-24v-100a.html',
    ],
    prefer: /batteryprotect|battery-protect|victron/i,
  },
  {
    name: 'citel-spd.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=citel+dps',
      'https://www.citel.fr/en/product/surge-protection-devices',
    ],
    prefer: /citel|spd|dps/i,
  },
  {
    name: 'growatt-wifi.jpg',
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=growatt+wifi+stick',
      'https://autosolar.co/busqueda?controller=search&s=growatt+shinewifi',
    ],
    prefer: /wifi|shine|dongle|stick/i,
  },
];

for (const job of jobs) {
  await scrapeFirstGood(job.pages, job.name, job.prefer, 10000);
}

console.log('\n=== OUT ===');
for (const f of fs.readdirSync(outDir)) {
  console.log(f, fs.statSync(path.join(outDir, f)).size);
}
