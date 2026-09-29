import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src', 'content', 'productos');

function detectKind(buf, imagePath) {
  const hex = buf.slice(0, 12).toString('hex');
  const head = buf.slice(0, 80).toString('utf8');
  if (/^ffd8ff/i.test(hex)) return 'jpeg';
  if (/^89504e47/i.test(hex)) return 'png';
  if (/^52494646/i.test(hex) && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (/<svg/i.test(head) || imagePath.endsWith('.svg')) return 'svg';
  if (/<!DOCTYPE|<html/i.test(head)) return 'html-error';
  return 'unknown';
}

function audit(category) {
  const rows = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    if (!new RegExp(`^category:\\s*["']?${category}`, 'm').test(text)) continue;
    if (/^draft:\s*true/m.test(text)) continue;
    const title = (text.match(/^title:\s*"([^"]+)/m) || [])[1] || f;
    const image = (text.match(/^image:\s*"([^"]+)/m) || [])[1] || '';
    const brand = (text.match(/^brand:\s*"([^"]+)/m) || [])[1] || '';
    const model = (text.match(/^model:\s*"([^"]+)/m) || [])[1] || '';
    const sku = (text.match(/^sku:\s*"([^"]+)/m) || [])[1] || '';
    const power = (text.match(/^power:\s*"([^"]+)/m) || [])[1] || '';
    const pending = /^imagenPendiente:\s*true/m.test(text);
    const abs = path.join(root, 'public', image.replace(/^\//, ''));
    const exists = Boolean(image) && fs.existsSync(abs);
    let size = 0;
    let kind = 'missing';
    if (exists) {
      const buf = fs.readFileSync(abs);
      size = buf.length;
      kind = detectKind(buf, image);
    }
    const weak =
      /placeholder|Logo|\.svg$/i.test(image) ||
      /logo-|Must\.png|huawei\.png|victron|GoodWe|growatt|felicity/i.test(path.basename(image)) &&
        /logo|Logo|\.svg$/i.test(image);
    // Logos / brand marks commonly used as stand-ins
    const looksLikeLogo =
      /logo|Logo|\.svg$|placeholders\//i.test(image) ||
      /\/images\/(Must|huawei|Longi|JA_Solar|victron|logo)/i.test(image) ||
      size > 0 && size < 25000 && /png$/i.test(image) && /logo|brand/i.test(image);
    const bad =
      !image ||
      !exists ||
      size < 3000 ||
      kind === 'html-error' ||
      kind === 'unknown' ||
      kind === 'svg' ||
      pending ||
      /placeholders\//i.test(image) ||
      /Logo\.svg|logo-/i.test(image) ||
      looksLikeLogo;

    rows.push({
      slug: f.replace(/\.md$/, ''),
      title,
      brand,
      model,
      sku,
      power,
      image,
      exists,
      size,
      kind,
      pending,
      bad,
    });
  }
  return rows;
}

const inv = audit('inversores');
const bat = audit('baterias');

const summary = {
  inversores: {
    total: inv.length,
    bad: inv.filter((r) => r.bad).length,
    ok: inv.filter((r) => !r.bad).length,
  },
  baterias: {
    total: bat.length,
    bad: bat.filter((r) => r.bad).length,
    ok: bat.filter((r) => !r.bad).length,
  },
};

console.log(JSON.stringify(summary, null, 2));
console.log('\n=== INVERSORES BAD (sample brands) ===');
const byBrandInv = {};
for (const r of inv.filter((x) => x.bad)) {
  byBrandInv[r.brand || '?'] = (byBrandInv[r.brand || '?'] || 0) + 1;
}
console.log(byBrandInv);
console.log('\n=== BATERIAS BAD ===');
for (const r of bat.filter((x) => x.bad)) {
  console.log(`${r.slug} | ${r.brand} | ${r.model || r.sku} | ${r.image} | ${r.kind} ${r.size}`);
}
console.log('\n=== INVERSORES BAD list (first 40) ===');
for (const r of inv.filter((x) => x.bad).slice(0, 40)) {
  console.log(`${r.slug} | ${r.brand} | ${r.model || r.sku} | ${r.power} | ${r.image}`);
}

fs.writeFileSync(
  path.join(root, 'data', '_tmp-audit-inv-bat.json'),
  JSON.stringify({ summary, inversoresBad: inv.filter((r) => r.bad), bateriasBad: bat.filter((r) => r.bad), inversoresOk: inv.filter((r) => !r.bad).slice(0, 5) }, null, 2)
);

// Existing image folders
for (const sub of [
  'public/images/productos-tienda/inversores',
  'public/images/productos-tienda/baterias',
  'public/images/Productos tienda/Inversores',
  'public/images/Productos tienda/baterias',
]) {
  const p = path.join(root, ...sub.split('/'));
  if (fs.existsSync(p)) {
    console.log('\nDIR', sub, fs.readdirSync(p).length);
    console.log(fs.readdirSync(p).slice(0, 20).join(' | '));
  }
}
