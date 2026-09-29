import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outProd = path.join(root, 'public', 'images', 'productos-tienda');
const outLogos = path.join(root, 'public', 'images', 'marcas');
fs.mkdirSync(path.join(outProd, 'controladores'), { recursive: true });
fs.mkdirSync(path.join(outProd, 'monitoreo'), { recursive: true });
fs.mkdirSync(path.join(outProd, 'bombeo'), { recursive: true });
fs.mkdirSync(path.join(outProd, 'accesorios'), { recursive: true });
fs.mkdirSync(outLogos, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const BAD = /colombia-map|logo-only|favicon|banner|facebook|kit-|bateria-gel|panel-solar-bifacial|EMPRESAS/i;

async function download(url, dest, minBytes = 8000) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: new URL(url).origin + '/' },
      redirect: 'follow',
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const ok =
      r.ok &&
      buf.length >= minBytes &&
      (buf[0] === 0xff || buf[0] === 0x89 || buf.toString('utf8', 0, 4) === 'RIFF' || buf[0] === 0x3c);
    // allow SVG (starts with <) for logos only if dest ends with .svg
    if (!ok && !(dest.endsWith('.svg') && buf.length > 200 && buf.includes(60))) {
      console.log('SKIP', r.status, buf.length, url.slice(0, 110));
      return false;
    }
    if (buf.length === 54077 || buf.length === 35078) return false;
    fs.writeFileSync(dest, buf);
    console.log('OK', path.relative(root, dest), buf.length);
    return true;
  } catch (e) {
    console.log('FAIL', e.message, String(url).slice(0, 80));
    return false;
  }
}

async function imgsFromPage(pageUrl) {
  const r = await fetch(pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
  console.log('PAGE', r.status, pageUrl.slice(0, 100));
  if (!r.ok) return [];
  const html = await r.text();
  const out = new Set();
  for (const m of html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/gi)) {
    out.add(m[0].replace(/&amp;/g, '&'));
  }
  for (const m of html.matchAll(/(?:src|href|content)=["']([^"']+\.(?:jpg|jpeg|png|webp|svg)[^"']*)["']/gi)) {
    let u = m[1].split(/\s+/)[0].replace(/&amp;/g, '&');
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = new URL(pageUrl).origin + u;
    out.add(u);
  }
  return [...out].filter((u) => !BAD.test(u));
}

async function saveFromPages(pages, dest, preferRe, min = 12000) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > min) {
    console.log('KEEP', path.basename(dest));
    return true;
  }
  for (const page of pages) {
    const imgs = await imgsFromPage(page);
    const ranked = imgs.sort((a, b) => {
      const score = (u) =>
        (preferRe && preferRe.test(u) ? 10 : 0) +
        (/cdn\.autosolar|victronenergy\.com\/upload|upload\/documents|catalog\/product|wp-content|shopify/i.test(u)
          ? 6
          : 0) +
        (!/thumb|icon|logo|sprite|banner/i.test(u) ? 2 : -4);
      return score(b) - score(a);
    });
    console.log(' top', path.basename(dest), ranked.slice(0, 6).map((u) => u.slice(0, 90)));
    for (const u of ranked.slice(0, 15)) {
      const full = u.replace(/-thumb(?:2x)?\./, '.').replace(/%20/g, ' ');
      if (await download(full, dest, min)) return true;
    }
  }
  return false;
}

// --- Product photos ---
const productJobs = [
  {
    dest: path.join(outProd, 'controladores', 'victron-smartsolar-mppt.jpg'),
    pages: [
      'https://www.victronenergy.com/solar-charge-controllers/smartsolar-mppt-100-30-100-50',
      'https://www.victronenergy.com.br/solar-charge-controllers/smartsolar-100-30-100-50',
      'https://autosolar.co/busqueda?controller=search&s=victron+smartsolar+mppt+100%2F50',
    ],
    prefer: /SmartSolar|MPPT|100.?50|100.?30|upload\/documents/i,
  },
  {
    dest: path.join(outProd, 'controladores', 'victron-bluesolar-mppt.jpg'),
    pages: [
      'https://www.victronenergy.com/solar-charge-controllers/bluesolar-mppt-100-30',
      'https://autosolar.co/busqueda?controller=search&s=victron+bluesolar+mppt',
    ],
    prefer: /BlueSolar|MPPT|upload\/documents/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'victron-cerbo-gx.jpg'),
    pages: [
      'https://www.victronenergy.com/panel-systems-remote-monitoring/cerbo-gx',
      'https://autosolar.co/busqueda?controller=search&s=victron+cerbo+gx',
    ],
    prefer: /Cerbo|GX|upload\/documents/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'victron-gx-touch.jpg'),
    pages: [
      'https://www.victronenergy.com/panel-systems-remote-monitoring/gx-touch',
      'https://autosolar.co/busqueda?controller=search&s=victron+gx+touch',
    ],
    prefer: /Touch|GX|upload\/documents/i,
  },
  {
    dest: path.join(outProd, 'controladores', 'inti-mppt.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=controlador+mppt+inti',
      'https://autosolar.co/busqueda?controller=search&s=inti+mppt',
    ],
    prefer: /inti|mppt|controlador/i,
  },
  {
    dest: path.join(outProd, 'bombeo', 'kolos-bomba-solar.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=bomba+solar+kolos',
      'https://autosolar.co/bombas-de-agua-solar',
    ],
    prefer: /kolos|bomba|pump/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'goodwe-ezlogger.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=goodwe+ezlogger',
      'https://autosolar.co/busqueda?controller=search&s=goodwe+sec1000',
    ],
    prefer: /ezlogger|goodwe|sec1000|datalogger/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'growatt-shine.jpg'),
    pages: [
      'https://autosolar.co/accesorios-de-inversores/monitorizacion-growatt-shine-wifi-x',
      'https://autosolar.co/busqueda?controller=search&s=growatt+shinewifi',
    ],
    prefer: /shine|wifi|growatt|3202018/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'hoymiles-dtu.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=hoymiles+dtu',
      'https://autosolar.co/busqueda?controller=search&s=dtu-pro+hoymiles',
    ],
    prefer: /dtu|hoymiles/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'deye-logger.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=deye+logger',
      'https://autosolar.co/busqueda?controller=search&s=datalogger+deye',
    ],
    prefer: /deye|logger|wifi/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'apsystems-ecu.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=apsystems+ecu',
      'https://autosolar.co/busqueda?controller=search&s=ecu-r+apsystems',
    ],
    prefer: /ecu|apsystems/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'solis-datamanager.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=solis+datamanager',
      'https://autosolar.co/busqueda?controller=search&s=solis+wifi+stick',
    ],
    prefer: /solis|datamanager|wifi/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'huawei-smartlogger.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=huawei+smartlogger',
      'https://autosolar.co/busqueda?controller=search&s=huawei+dongle',
    ],
    prefer: /smartlogger|dongle|huawei/i,
  },
  {
    dest: path.join(outProd, 'monitoreo', 'eastron-meter.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=eastron+sdm',
      'https://autosolar.co/busqueda?controller=search&s=medidor+eastron',
    ],
    prefer: /eastron|sdm|medidor/i,
  },
  {
    dest: path.join(outProd, 'controladores', 'studer-vs.jpg'),
    pages: [
      'https://autosolar.co/busqueda?controller=search&s=studer+vs',
      'https://www.europe-solarstore.com/studer-solar-charge-controller.html',
    ],
    prefer: /studer|VS-|charge/i,
  },
];

for (const job of productJobs) {
  await saveFromPages(job.pages, job.dest, job.prefer);
}

// Direct Victron official PNGs (common pattern)
const victronDirect = [
  [
    'https://www.victronenergy.com/upload/documents/SmartSolar%20MPPT%20100-50%20(front).png',
    path.join(outProd, 'controladores', 'victron-smartsolar-mppt.jpg'),
  ],
  [
    'https://www.victronenergy.com/upload/documents/SmartSolar%20MPPT%20100%2050%20(front).png',
    path.join(outProd, 'controladores', 'victron-smartsolar-mppt.jpg'),
  ],
  [
    'https://www.victronenergy.com/upload/documents/Cerbo%20GX%20(front).png',
    path.join(outProd, 'monitoreo', 'victron-cerbo-gx.jpg'),
  ],
];
for (const [url, dest] of victronDirect) {
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 20000) {
    await download(url, dest, 10000);
  }
}

// --- Brand logos for carousel ---
const logoJobs = [
  { name: 'huawei.png', src: path.join(root, 'public/images/huawei.png') },
  { name: 'growatt.png', src: path.join(root, 'public/images/growatt.png') },
  { name: 'victron.jpg', src: path.join(root, 'public/images/logo-Victron-Energy-Ecogreensolar-1.jpg') },
  { name: 'must.png', src: path.join(root, 'public/images/Must.png') },
  { name: 'solis.png', src: path.join(root, 'public/images/solis.png') },
  { name: 'longi.png', src: path.join(root, 'public/images/Longi.png') },
  { name: 'ja-solar.png', src: path.join(root, 'public/images/JA_Solar_Logo.svg.png') },
  { name: 'livoltek.png', src: path.join(root, 'public/images/livoltek.png') },
];
for (const { name, src } of logoJobs) {
  const dest = path.join(outLogos, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('LOGO copy', name);
  }
}

const logoDownloads = [
  {
    name: 'deye.png',
    pages: ['https://www.deyeinverter.com/', 'https://autosolar.co/fabricantes/deye'],
    prefer: /logo|deye/i,
  },
  {
    name: 'goodwe.png',
    pages: ['https://en.goodwe.com/', 'https://autosolar.co/fabricantes/goodwe'],
    prefer: /logo|goodwe/i,
  },
  {
    name: 'felicity.png',
    pages: ['https://www.felicitysolar.com/', 'https://latam.felicitysolar.com/'],
    prefer: /logo|felicity|cropped-f/i,
  },
  {
    name: 'hoymiles.png',
    pages: ['https://www.hoymiles.com/', 'https://autosolar.co/fabricantes/hoymiles'],
    prefer: /logo|hoymiles/i,
  },
  {
    name: 'apsystems.png',
    pages: ['https://apsystems.com/', 'https://autosolar.co/fabricantes/apsystems'],
    prefer: /logo|apsystems/i,
  },
  {
    name: 'fronius.png',
    pages: ['https://www.fronius.com/en/solar-energy', 'https://autosolar.co/fabricantes/fronius'],
    prefer: /logo|fronius/i,
  },
  {
    name: 'pylontech.png',
    pages: ['https://www.pylontech.com.cn/', 'https://autosolar.co/fabricantes/pylontech'],
    prefer: /logo|pylon/i,
  },
  {
    name: 'jinko.png',
    pages: ['https://www.jinkosolar.com/', 'https://autosolar.co/fabricantes/jinko'],
    prefer: /logo|jinko/i,
  },
  {
    name: 'suntree.png',
    pages: ['https://www.suntree.com.cn/', 'https://autosolar.co/fabricantes/suntree'],
    prefer: /logo|suntree/i,
  },
  {
    name: 'tensite.png',
    pages: ['https://autosolar.co/fabricantes/tensite', 'https://autosolar.co/busqueda?controller=search&s=tensite'],
    prefer: /logo|tensite/i,
  },
];

for (const job of logoDownloads) {
  const dest = path.join(outLogos, job.name);
  await saveFromPages(job.pages, dest, job.prefer, 1500);
}

console.log('\n=== PRODUCTOS ===');
for (const sub of ['controladores', 'monitoreo', 'bombeo', 'accesorios']) {
  const d = path.join(outProd, sub);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) console.log(sub, f, fs.statSync(path.join(d, f)).size);
}
console.log('\n=== LOGOS ===');
for (const f of fs.readdirSync(outLogos)) console.log(f, fs.statSync(path.join(outLogos, f)).size);
