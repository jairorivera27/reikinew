import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'images', 'productos-tienda', 'paneles-solares');
fs.mkdirSync(outDir, { recursive: true });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'image/*,*/*;q=0.8',
      Referer: referer || 'https://autosolar.co/',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`too small ${buf.length}`);
  // Reject HTML mistaken as image
  const head = buf.slice(0, 200).toString('utf8');
  if (/<!DOCTYPE|<html/i.test(head)) throw new Error('html not image');
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function skuImages(html, sku) {
  const re = new RegExp(`https://cdn\\.autosolar\\.co/images/${sku}/[^"'\\s>]+`, 'gi');
  const urls = [...html.matchAll(re)].map((m) => m[0].replace(/&amp;/g, '&'));
  const expanded = [];
  for (const u of urls) {
    if (/kit-|banner|promo|logo/i.test(u)) continue;
    expanded.push(u);
    if (u.includes('-thumb.')) expanded.push(u.replace('-thumb.', '.'));
  }
  // Prefer larger / non-thumb with panel in name
  return [...new Set(expanded)].sort((a, b) => {
    const score = (u) =>
      (/panel/i.test(u) ? 10 : 0) +
      (/thumb/i.test(u) ? -5 : 5) +
      (/large|big|full/i.test(u) ? 3 : 0);
    return score(b) - score(a);
  });
}

async function productPageImages(slug, sku) {
  const html = await fetchText(`https://autosolar.co/paneles-solares/${slug}`);
  return sku ? skuImages(html, sku) : [
    ...html.matchAll(/https:\/\/cdn\.autosolar\.co\/images\/\d+\/[^"'\s>]*panel[^"'\s>]*/gi),
  ].map((m) => m[0]);
}

const jobs = [
  {
    file: 'tensite-620w-bifacial.jpg',
    sku: '1002141',
    slug: 'panel-solar-bifacial-620w-n-type-tensite',
    products: ['panel-solar-bifacial-n-type-tensite-620w-1002141'],
  },
  {
    file: 'tensite-710w-bifacial.jpg',
    sku: '1002138',
    slug: 'panel-solar-bifacial-710w-n-type-tensite',
    products: ['panel-solar-bifacial-n-type-tensite-710w-1002138'],
  },
  {
    file: 'tensite-240w-mono.jpg',
    sku: '1002223',
    slug: 'panel-solar-monocristalino-240w-tensite',
    products: ['panel-solar-monocristalino-tensite-240w-1002223'],
  },
  {
    file: 'ja-solar-625w-bifacial.jpg',
    sku: '1002139',
    slug: 'panel-solar-bifacial-n-type-ja-solar-625w',
    altSlugs: [
      'panel-solar-bifacial-625w-ja-solar',
      'panel-solar-ja-solar-625w-n-type',
      'panel-solar-bifacial-625w-n-type-ja-solar',
    ],
    products: ['panel-solar-bifacial-n-type-ja-solar-625w-1002139'],
  },
  {
    file: 'ja-solar-715w-bifacial.jpg',
    sku: '1002140',
    slug: 'panel-solar-bifacial-n-type-ja-solar-715w',
    altSlugs: ['panel-solar-bifacial-715w-n-type-ja-solar'],
    products: ['panel-solar-bifacial-n-type-ja-solar-715w-1002140'],
  },
  {
    file: 'ja-solar-720w-bifacial.jpg',
    sku: '1002142',
    slug: 'panel-solar-bifacial-n-type-ja-solar-720w',
    altSlugs: ['panel-solar-bifacial-720w-n-type-ja-solar'],
    products: ['panel-solar-bifacial-n-type-ja-solar-720w-1002142'],
  },
  {
    file: 'felicity-1kw-mono.jpg',
    sku: '3004613',
    slug: 'panel-solar-monocristalino-felicity-1kw',
    altSlugs: ['panel-solar-felicity-1000w', 'panel-solar-1kw-felicity'],
    products: ['panel-solar-monocristalino-felicity-1kw-3004613'],
  },
];

// Remove previous bad files first
for (const bad of [
  'ja-solar-625w-bifacial.jpg',
  'ja-solar-715w-bifacial.jpg',
  'ja-solar-720w-bifacial.jpg',
  'felicity-1kw-mono.jpg',
  'trina-670w-deg21c.jpg',
  'must-panel-mono.jpg',
  'victron-bluesolar-mono.jpg',
]) {
  const p = path.join(outDir, bad);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

const results = [];

for (const job of jobs) {
  const dest = path.join(outDir, job.file);
  let urls = [];
  const slugs = [job.slug, ...(job.altSlugs || [])];
  for (const slug of slugs) {
    try {
      urls.push(...(await productPageImages(slug, job.sku)));
    } catch {
      /* next */
    }
  }
  try {
    const searchHtml = await fetchText(
      `https://autosolar.co/busqueda?controller=search&s=${job.sku}`
    );
    urls.push(...skuImages(searchHtml, job.sku));
  } catch {
    /* ignore */
  }
  urls = [...new Set(urls)].filter((u) => u.includes(`/${job.sku}/`) && /panel/i.test(u));

  let ok = false;
  for (const u of urls) {
    try {
      const size = await download(u, dest);
      results.push({ file: job.file, ok: true, size, url: u, products: job.products });
      console.log('OK', job.file, size, u);
      ok = true;
      break;
    } catch (e) {
      console.warn('try fail', job.file, u, e.message);
    }
  }
  if (!ok) {
    results.push({ file: job.file, ok: false, candidates: urls });
    console.warn('FAIL', job.file, 'candidates', urls.length);
  }
}

// Victron: smaller official front photo
try {
  const dest = path.join(outDir, 'victron-bluesolar-mono.jpg');
  const url =
    'https://www.victronenergy.com/upload/documents/20W-36%20cells%20Mono%20275x450x25mm%204c%20%28front%29.jpg';
  const size = await download(url, dest, 'https://www.victronenergy.com/');
  results.push({
    file: 'victron-bluesolar-mono.jpg',
    ok: true,
    size,
    url,
    products: ['panel-solar-monocristalino-victron-scc900300000'],
  });
  console.log('OK victron', size);
} catch (e) {
  console.warn('victron fail', e.message);
}

// Trina / JA fallback: copy existing catalog photos already in repo
const legacyDir = path.join(root, 'public', 'images', 'Productos tienda', 'Panel solar');
const copies = [
  {
    fromNames: [
      'Trinasolar 670W Medellín.png',
      'Trinasolar 650W Medellín.png',
      'Trinasolar 700W Medellín.png',
    ],
    to: 'trina-670w-deg21c.jpg',
    products: ['panel-solar-monocristalino-trina-670w-tsm-670deg21c-20'],
  },
  {
    fromNames: [
      'Panel Solar JAsolar 595w Medellín.png',
      'JA Solar 595W Medellín.png',
    ],
    to: 'ja-solar-familia-bifacial.jpg',
    products: [
      'panel-solar-bifacial-n-type-ja-solar-625w-1002139',
      'panel-solar-bifacial-n-type-ja-solar-715w-1002140',
      'panel-solar-bifacial-n-type-ja-solar-720w-1002142',
    ],
  },
];

function findLegacy(names) {
  if (!fs.existsSync(legacyDir)) return null;
  const files = fs.readdirSync(legacyDir);
  for (const want of names) {
    const hit = files.find((f) => f.toLowerCase() === want.toLowerCase() || f.includes(want.split(' ')[0]));
    if (hit) return path.join(legacyDir, hit);
  }
  // fuzzy
  for (const f of files) {
    for (const want of names) {
      const key = want.replace(/Medellín|\.png/gi, '').trim().toLowerCase();
      if (f.toLowerCase().includes(key.split(' ')[0].toLowerCase()) && /\d{3}/.test(f)) {
        if (want.match(/\d{3}/) && f.includes(want.match(/\d{3}/)[0])) return path.join(legacyDir, f);
      }
    }
  }
  return null;
}

for (const c of copies) {
  const src = findLegacy(c.fromNames);
  const dest = path.join(outDir, c.to.replace(/\.jpg$/, path.extname(src || '.png') || '.png'));
  // normalize extension from source
  if (!src) {
    results.push({ file: c.to, ok: false, reason: 'no legacy' });
    continue;
  }
  const ext = path.extname(src);
  const finalName = c.to.replace(/\.(jpg|png|webp)$/i, ext);
  const finalPath = path.join(outDir, finalName);
  fs.copyFileSync(src, finalPath);
  results.push({ file: finalName, ok: true, from: src, products: c.products, copied: true });
  console.log('COPY', finalName, '<-', src);
}

fs.writeFileSync(path.join(root, 'data', '_tmp-paneles-imagenes.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
