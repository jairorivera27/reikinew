import fs from 'fs';
import path from 'path';

const root = process.cwd();
const productosDir = path.join(root, 'src/content/productos');
const publicDir = path.join(root, 'public');

const brandNames = [
  'huawei', 'growatt', 'victron', 'astroenergy', 'livoltek', 'goodwe', 'fronius', 'deye', 'must',
  'felicity', 'pylontech', 'solis', 'jinko', 'trina', 'jasolar', 'ja-solar', 'ja_solar', 'apsystems',
  'hoymiles', 'byd', 'dyness', 'soluna', 'pytes', 'tensite', 'studer', 'epever', 'suntree', 'leader',
  'citel', 'abb', 'bslbatt', 'kolos', 'powertech', 'canadian', 'longi', 'sma', 'solaredge', 'rec',
  'qcells', 'astro', 'livoltek',
];

function isBrandLogo(img) {
  if (!img) return false;
  if (img.includes('/productos-tienda/') || img.includes('/Productos tienda/') || img.includes('/placeholders/')) {
    return false;
  }
  const base = path.basename(img).toLowerCase();
  if (/logo/i.test(base)) return true;
  // Root-level /images/<something>.ext
  if (/^\/images\/[^/]+$/i.test(img)) {
    const nameNoExt = base.replace(/\.(png|jpg|jpeg|svg|webp)$/i, '');
    if (brandNames.some((b) => nameNoExt === b || nameNoExt.includes(b))) return true;
  }
  return false;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('---', 3);
  if (end < 0) return null;
  const fm = content.slice(3, end);
  const get = (key) => {
    const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
    if (!m) return null;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
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

function fileExists(imgPath) {
  if (!imgPath) return false;
  const rel = decodeURIComponent(imgPath.replace(/^\//, ''));
  return fs.existsSync(path.join(publicDir, rel));
}

const files = fs.readdirSync(productosDir).filter((f) => f.endsWith('.md'));
const flagged = [];
let totalPublished = 0;
let totalOk = 0;

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const content = fs.readFileSync(path.join(productosDir, file), 'utf8');
  const meta = parseFrontmatter(content);
  if (!meta || meta.draft) continue;
  totalPublished++;

  const reasons = [];
  const img = meta.image;
  if (!img || !img.trim()) {
    reasons.push('missing');
  } else {
    if (img.includes('/placeholders/')) reasons.push('placeholder');
    if (isBrandLogo(img)) reasons.push('brand_logo');
    if (!fileExists(img)) reasons.push('missing_file');
  }
  if (meta.imagenPendiente) reasons.push('imagenPendiente');

  if (reasons.length) {
    flagged.push({
      slug,
      title: meta.title,
      category: meta.category || 'unknown',
      brand: meta.brand || 'unknown',
      image: img || '(none)',
      reasons: [...new Set(reasons)],
    });
  } else {
    totalOk++;
  }
}

const byCat = {};
const byBrand = {};
const byReason = {};
const byCatBrand = {};
for (const f of flagged) {
  byCat[f.category] = (byCat[f.category] || 0) + 1;
  byBrand[f.brand] = (byBrand[f.brand] || 0) + 1;
  for (const r of f.reasons) byReason[r] = (byReason[r] || 0) + 1;
  const kb = `${f.category}|${f.brand}`;
  if (!byCatBrand[kb]) {
    byCatBrand[kb] = {
      category: f.category,
      brand: f.brand,
      count: 0,
      reasons: {},
      examples: [],
    };
  }
  byCatBrand[kb].count++;
  for (const r of f.reasons) {
    byCatBrand[kb].reasons[r] = (byCatBrand[kb].reasons[r] || 0) + 1;
  }
  if (byCatBrand[kb].examples.length < 4) {
    byCatBrand[kb].examples.push({ slug: f.slug, image: f.image, reasons: f.reasons });
  }
}

const sortObj = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const pathCounts = {};
for (const f of flagged) pathCounts[f.image] = (pathCounts[f.image] || 0) + 1;

const score = (x) =>
  (x.reasons.includes('missing') ? 12 : 0) +
  (x.reasons.includes('brand_logo') ? 10 : 0) +
  (x.reasons.includes('missing_file') ? 9 : 0) +
  (x.reasons.includes('placeholder') ? 8 : 0) +
  (x.reasons.includes('imagenPendiente') ? 3 : 0) +
  (pathCounts[x.image] || 0);

const worst = [...flagged].sort((a, b) => score(b) - score(a));
const priority = Object.values(byCatBrand).sort((a, b) => b.count - a.count);

// Also count by reason within category
const catBreakdown = {};
for (const f of flagged) {
  if (!catBreakdown[f.category]) {
    catBreakdown[f.category] = { total: 0, placeholder: 0, brand_logo: 0, missing_file: 0, missing: 0, imagenPendiente: 0 };
  }
  catBreakdown[f.category].total++;
  for (const r of f.reasons) {
    if (catBreakdown[f.category][r] !== undefined) catBreakdown[f.category][r]++;
  }
}

const report = {
  totals: {
    mdFiles: files.length,
    published: totalPublished,
    ok: totalOk,
    flagged: flagged.length,
    uniqueBadPaths: new Set(flagged.map((f) => f.image)).size,
    byReason,
    byCategory: Object.fromEntries(sortObj(byCat)),
    byBrandTop: Object.fromEntries(sortObj(byBrand).slice(0, 40)),
    categoryBreakdown: catBreakdown,
  },
  topBadPaths: sortObj(pathCounts).slice(0, 30),
  priorityDownload: priority.slice(0, 35),
  worstOffenders: worst.slice(0, 80).map((f) => ({
    slug: f.slug,
    category: f.category,
    brand: f.brand,
    image: f.image,
    reasons: f.reasons,
  })),
};

fs.writeFileSync(path.join(root, 'data/_tmp-audit-images-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.totals, null, 2));
console.log('\n=== TOP BAD PATHS ===');
for (const [p, c] of report.topBadPaths) console.log(`${c}\t${p}`);
console.log('\n=== PRIORITY DOWNLOAD (cat|brand) ===');
for (const p of report.priorityDownload.slice(0, 25)) {
  console.log(`${p.count}\t${p.category} / ${p.brand}\t${JSON.stringify(p.reasons)}\tex:${p.examples[0]?.slug}`);
}
console.log('\n=== WORST 40 ===');
for (const w of report.worstOffenders.slice(0, 40)) {
  console.log(`${w.slug}\t${w.category}/${w.brand}\t${w.image}\t[${w.reasons.join(',')}]`);
}
