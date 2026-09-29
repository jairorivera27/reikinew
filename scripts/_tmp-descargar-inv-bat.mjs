import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audit = JSON.parse(
  fs.readFileSync(path.join(root, 'data', '_tmp-audit-inv-bat.json'), 'utf8')
);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const outInv = path.join(root, 'public', 'images', 'productos-tienda', 'inversores');
const outBat = path.join(root, 'public', 'images', 'productos-tienda', 'baterias');
fs.mkdirSync(outInv, { recursive: true });
fs.mkdirSync(outBat, { recursive: true });

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      Referer: referer || 'https://autosolar.co/',
    },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error('small ' + buf.length);
  if (/<!DOCTYPE|<html/i.test(buf.slice(0, 80).toString('utf8'))) throw new Error('html');
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function skuImagesFromHtml(html, sku) {
  const re = new RegExp(`https://cdn\\.autosolar\\.co/images/${sku}/[^"'\\s>]+`, 'gi');
  const urls = [...html.matchAll(re)].map((m) => m[0].replace(/&amp;/g, '&'));
  const expanded = [];
  for (const u of urls) {
    if (/kit-|banner|promo|logo|envio|seguridad/i.test(u)) continue;
    expanded.push(u);
    if (u.includes('-thumb.')) expanded.push(u.replace('-thumb.', '.'));
  }
  return [...new Set(expanded)].sort((a, b) => {
    const score = (u) =>
      (/inversor|bateria|battery|inverter|panel/i.test(u) ? 8 : 0) +
      (/thumb/i.test(u) ? -4 : 6) +
      (u.length > 80 ? 1 : 0);
    return score(b) - score(a);
  });
}

async function searchAutosolar(q) {
  const url = `https://autosolar.co/busqueda?controller=search&s=${encodeURIComponent(q)}`;
  const html = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const imgs = [
    ...html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/\d+\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi),
  ]
    .map((m) => m[0])
    .filter((u) => !/kit-|banner|promo|logo|envio|seguridad|map/i.test(u));
  const skus = [...html.matchAll(/cdn\.autosolar\.co\/images\/(\d+)\//g)].map((m) => m[1]);
  return { html, imgs: [...new Set(imgs)], skus: [...new Set(skus)] };
}

async function fetchBySku(sku) {
  const { html } = await searchAutosolar(sku);
  return skuImagesFromHtml(html, sku);
}

/** Brand / model family download jobs */
const jobs = [
  // Batteries
  { kind: 'bat', file: 'felicity-fla48.jpg', queries: ['FLA48280', '1880836', 'bateria litio felicity 48v'] },
  { kind: 'bat', file: 'felicity-fla24.jpg', queries: ['FLA24280', 'FLA24171', 'bateria felicity 24v'] },
  { kind: 'bat', file: 'felicity-12v.jpg', queries: ['1880812', 'bateria felicity 12v'] },
  { kind: 'bat', file: 'pylontech-us.jpg', queries: ['1708249', 'pylontech us2000', 'pylontech uf5000'] },
  { kind: 'bat', file: 'pylontech-uf5000.jpg', queries: ['UF5000', 'pylontech uf5000'] },
  { kind: 'bat', file: 'dyness-bx51100.jpg', queries: ['BX51100', 'dyness bx51100'] },
  { kind: 'bat', file: 'bslbatt-5-12.jpg', queries: ['BSLBATT', 'bslbatt 5.12'] },
  { kind: 'bat', file: 'goodwe-lynxl.jpg', queries: ['goodwe lynx', 'GW14', 'bateria goodwe 51.2'] },
  { kind: 'bat', file: 'growatt-ark.jpg', queries: ['growatt ark', 'growatt bateria 5.0kwh'] },
  { kind: 'bat', file: 'huawei-luna.jpg', queries: ['huawei luna2000', 'LUNA2000'] },
  { kind: 'bat', file: 'byd-battery.jpg', queries: ['byd battery-box', 'byd hvm'] },
  { kind: 'bat', file: 'pytes-battery.jpg', queries: ['pytes e-box', 'pytes battery'] },
  { kind: 'bat', file: 'soluna-battery.jpg', queries: ['soluna battery', 'soluna eos'] },

  // Inverters
  { kind: 'inv', file: 'huawei-sun2000.jpg', queries: ['SUN2000-5KTL', 'huawei sun2000 5kw', '1002001'] },
  { kind: 'inv', file: 'huawei-sun2000-m3.jpg', queries: ['SUN2000-20KTL-M3', 'SUN2000-50KTL-M3'] },
  { kind: 'inv', file: 'goodwe-es.jpg', queries: ['GW5000-ES', 'goodwe es 5kw'] },
  { kind: 'inv', file: 'goodwe-sdt.jpg', queries: ['GW10K-SDT', 'goodwe sdt'] },
  { kind: 'inv', file: 'growatt-min.jpg', queries: ['growatt min 3000', 'growatt min'] },
  { kind: 'inv', file: 'growatt-mod.jpg', queries: ['growatt mod', 'growatt mid'] },
  { kind: 'inv', file: 'deye-hybrid.jpg', queries: ['deye sun-8k', 'deye hybrid 8kw'] },
  { kind: 'inv', file: 'felicity-hybrid.jpg', queries: ['felicity inversor 8kw', '3004616'] },
  { kind: 'inv', file: 'victron-multiplus.jpg', queries: ['victron multiplus', 'PMP'] },
  { kind: 'inv', file: 'victron-quattro.jpg', queries: ['victron quattro', 'QUA'] },
  { kind: 'inv', file: 'victron-phoenix.jpg', queries: ['victron phoenix inverter', 'PIN'] },
  { kind: 'inv', file: 'hoymiles-hms.jpg', queries: ['hoymiles hms-800', 'hoymiles microinversor'] },
  { kind: 'inv', file: 'apsystems-ds3.jpg', queries: ['apsystems ds3', 'apsystems micro'] },
  { kind: 'inv', file: 'fronius-primo.jpg', queries: ['fronius primo', 'fronius symo'] },
  { kind: 'inv', file: 'must-pv.jpg', queries: ['must pv18', 'must pv30'] },
  { kind: 'inv', file: 'studer-xtender.jpg', queries: ['studer xtender', 'studer'] },
  { kind: 'inv', file: 'tensite-inverter.jpg', queries: ['tensite inversor'] },
];

const results = [];

for (const job of jobs) {
  const destDir = job.kind === 'bat' ? outBat : outInv;
  const dest = path.join(destDir, job.file);
  let saved = false;
  const tried = [];
  for (const q of job.queries) {
    try {
      let urls = [];
      if (/^\d{6,}$/.test(q) || /^[A-Z0-9-]{5,}$/i.test(q)) {
        urls = await fetchBySku(q);
      }
      if (!urls.length) {
        const s = await searchAutosolar(q);
        urls = s.imgs;
        for (const sku of s.skus.slice(0, 3)) {
          urls.push(...(await fetchBySku(sku)));
        }
      }
      urls = [...new Set(urls)];
      for (const u of urls.slice(0, 8)) {
        tried.push(u);
        try {
          const n = await download(u, dest);
          results.push({ file: job.file, kind: job.kind, ok: true, size: n, url: u, q });
          console.log('OK', job.file, n, q, u.slice(0, 90));
          saved = true;
          break;
        } catch {
          /* next url */
        }
      }
      if (saved) break;
    } catch (e) {
      console.warn('query fail', job.file, q, e.message);
    }
  }
  if (!saved) {
    results.push({ file: job.file, kind: job.kind, ok: false, tried: tried.slice(0, 5) });
    console.warn('FAIL', job.file);
  }
}

fs.writeFileSync(
  path.join(root, 'data', '_tmp-dl-inv-bat.json'),
  JSON.stringify(results, null, 2)
);
console.log(
  'done',
  results.filter((r) => r.ok).length,
  '/',
  results.length
);
