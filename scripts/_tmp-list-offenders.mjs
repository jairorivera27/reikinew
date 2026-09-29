import fs from 'fs';

const r = JSON.parse(fs.readFileSync('data/_tmp-audit-images-report.json', 'utf8'));

// Group offenders by image path with sample slugs
const byPath = {};
for (const w of r.worstOffenders) {
  if (!byPath[w.image]) byPath[w.image] = { count: 0, samples: [], brands: new Set(), cats: new Set() };
}
// Need all flagged - reload from regenerating lightly from priority examples + expand
// Re-scan is safer
import path from 'path';
import { readdirSync, readFileSync, existsSync } from 'fs';

const productosDir = 'src/content/productos';
const publicDir = 'public';
const brandNames = [
  'huawei', 'growatt', 'victron', 'astroenergy', 'livoltek', 'goodwe', 'fronius', 'deye', 'must',
  'felicity', 'pylontech', 'solis', 'jinko', 'trina', 'jasolar', 'ja-solar', 'ja_solar', 'apsystems',
  'hoymiles', 'byd', 'dyness', 'soluna', 'pytes', 'tensite', 'studer', 'epever', 'suntree', 'leader',
  'citel', 'abb', 'bslbatt', 'kolos', 'powertech', 'canadian', 'longi', 'sma', 'solaredge',
];

function isBrandLogo(img) {
  if (!img) return false;
  if (img.includes('/productos-tienda/') || img.includes('/Productos tienda/') || img.includes('/placeholders/')) return false;
  const base = path.basename(img).toLowerCase();
  if (/logo/i.test(base)) return true;
  if (/^\/images\/[^/]+$/i.test(img)) {
    const nameNoExt = base.replace(/\.(png|jpg|jpeg|svg|webp)$/i, '');
    if (brandNames.some((b) => nameNoExt === b || nameNoExt.includes(b))) return true;
  }
  return false;
}

function parse(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('---', 3);
  const fm = content.slice(3, end);
  const get = (key) => {
    const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
    if (!m) return null;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    return v;
  };
  return {
    title: get('title'),
    image: get('image'),
    category: get('category'),
    brand: get('brand'),
    draft: get('draft') === 'true',
    imagenPendiente: get('imagenPendiente') === 'true',
  };
}

const groups = {};
const pubCats = {};
let published = 0;
let ok = 0;

for (const file of readdirSync(productosDir).filter((f) => f.endsWith('.md'))) {
  const slug = file.replace(/\.md$/, '');
  const meta = parse(readFileSync(path.join(productosDir, file), 'utf8'));
  if (!meta || meta.draft) continue;
  published++;
  pubCats[meta.category || 'unknown'] = (pubCats[meta.category || 'unknown'] || 0) + 1;

  const reasons = [];
  const img = meta.image;
  if (!img) reasons.push('missing');
  else {
    if (img.includes('/placeholders/')) reasons.push('placeholder');
    if (isBrandLogo(img)) reasons.push('brand_logo');
    const rel = decodeURIComponent(img.replace(/^\//, ''));
    if (!existsSync(path.join(publicDir, rel))) reasons.push('missing_file');
  }
  if (meta.imagenPendiente) reasons.push('imagenPendiente');
  if (!reasons.length) {
    ok++;
    continue;
  }
  if (!groups[img || '(none)']) {
    groups[img || '(none)'] = { count: 0, reasons: new Set(), samples: [], brands: new Set(), cats: new Set() };
  }
  const g = groups[img || '(none)'];
  g.count++;
  reasons.forEach((x) => g.reasons.add(x));
  g.brands.add(meta.brand || 'unknown');
  g.cats.add(meta.category || 'unknown');
  if (g.samples.length < 5) g.samples.push({ slug, brand: meta.brand, category: meta.category });
}

console.log('PUBLISHED BY CAT');
for (const [k, v] of Object.entries(pubCats).sort((a, b) => b[1] - a[1])) {
  console.log(`${v}\t${k}`);
}
console.log(`\npublished=${published} ok=${ok} flagged=${published - ok}`);

console.log('\nOFFENDER PATH GROUPS');
for (const [img, g] of Object.entries(groups).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`\n${g.count}x  ${img}`);
  console.log(`  reasons: ${[...g.reasons].join(', ')}`);
  console.log(`  brands: ${[...g.brands].join(', ')}`);
  console.log(`  cats: ${[...g.cats].join(', ')}`);
  for (const s of g.samples) console.log(`  - ${s.slug} (${s.category}/${s.brand})`);
}
