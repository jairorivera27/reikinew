import fs from 'fs';
import path from 'path';

const dir = 'src/content/productos';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const o = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (/^-?\d+(\.\d+)?$/.test(v)) o[k] = Number(v);
    else if (v === 'true') o[k] = true;
    else if (v === 'false') o[k] = false;
    else o[k] = v;
  }
  return o;
}

const productos = [];
for (const f of files) {
  const data = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (data.draft === true) continue;
  productos.push({ slug: f.replace(/\.md$/, ''), ...data });
}

const promos = productos
  .filter((p) => p.precioAnterior && p.descuentoPct)
  .sort((a, b) => b.descuentoPct - a.descuentoPct);

console.log('PROMOS', promos.length);
for (const p of promos) {
  console.log(
    p.descuentoPct + '%',
    p.slug,
    '|',
    p.title,
    '|',
    p.category,
    '|',
    p.price,
    '| order',
    p.homeCarouselOrder ?? '-'
  );
}

console.log('\nCAROUSEL ORDER');
for (const p of productos
  .filter((x) => x.homeCarouselOrder != null)
  .sort((a, b) => a.homeCarouselOrder - b.homeCarouselOrder)) {
  console.log(p.homeCarouselOrder, p.slug, p.title, p.precioAnterior ? 'PROMO' : '');
}
