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
  if (/^47494638/i.test(hex)) return 'gif';
  if (/<svg/i.test(head) || imagePath.endsWith('.svg')) return 'svg';
  if (/<!DOCTYPE|<html/i.test(head)) return 'html-error';
  return 'unknown';
}

const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!/^category:\s*["']?paneles/m.test(text)) continue;
  const draft = /^draft:\s*true/m.test(text);
  const title = (text.match(/^title:\s*"([^"]+)/m) || [])[1] || f;
  const image = (text.match(/^image:\s*"([^"]+)/m) || [])[1] || '';
  const pending = /^imagenPendiente:\s*true/m.test(text);
  const slug = f.replace(/\.md$/, '');
  const abs = path.join(root, 'public', image.replace(/^\//, ''));
  const exists = Boolean(image) && fs.existsSync(abs);
  let size = 0;
  let kind = 'missing';
  if (exists) {
    const buf = fs.readFileSync(abs);
    size = buf.length;
    kind = detectKind(buf, image);
  }

  const weakPath =
    /placeholder|Logo|\.svg$/i.test(image) ||
    /Must\.png|Victron-Energy|JA_Solar_Logo|logo-/i.test(image);

  const bad =
    !draft &&
    (!image ||
      !exists ||
      size < 3000 ||
      kind === 'html-error' ||
      kind === 'unknown' ||
      kind === 'svg' ||
      weakPath ||
      pending);

  rows.push({ slug, draft, title, image, exists, size, kind, pending, weakPath, bad });
}

const active = rows.filter((r) => !r.draft);
const issues = active.filter((r) => r.bad);
const ok = active.filter((r) => !r.bad);

console.log(`ACTIVE OK: ${ok.length}`);
for (const r of ok) {
  console.log(`  OK  ${r.slug} | ${r.kind} ${r.size} | ${r.image}`);
}
console.log(`\nACTIVE ISSUES: ${issues.length}`);
for (const r of issues) {
  console.log(`  BAD ${r.slug}`);
  console.log(`      ${r.title}`);
  console.log(
    `      image=${r.image} exists=${r.exists} kind=${r.kind} size=${r.size} pending=${r.pending} weak=${r.weakPath}`
  );
}

// Also list orphan/missing referenced files in paneles-solares folder
const panelDir = path.join(root, 'public', 'images', 'productos-tienda', 'paneles-solares');
const files = fs.existsSync(panelDir) ? fs.readdirSync(panelDir) : [];
console.log(`\nFILES IN paneles-solares: ${files.length}`);
for (const f of files.sort()) {
  const st = fs.statSync(path.join(panelDir, f));
  console.log(`  ${f} (${st.size})`);
}

fs.writeFileSync(
  path.join(root, 'data', '_tmp-auditoria-paneles.json'),
  JSON.stringify({ ok, issues, files }, null, 2)
);
