/**
 * Auditoría de imágenes de producto vs marca/categoría.
 * Uso: node scripts/auditar-imagenes-productos.mjs
 * Escribe data/auditoria-imagenes.md y aplica placeholder en casos claros
 * (solo los listados en APPLY abajo, o --apply-all-suspects).
 *
 * NO borra archivos de imagen.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROD_DIR = path.join(ROOT, 'src', 'content', 'productos');
const CAT_CFG = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'config', 'categorias-tienda.json'), 'utf8')
);

const placeholders = Object.fromEntries(
  CAT_CFG.categorias.map((c) => [c.id, c.imagenPorDefecto])
);

const MARCAS = [
  'goodwe',
  'growatt',
  'huawei',
  'felicity',
  'must',
  'victron',
  'deye',
  'solis',
  'jinko',
  'longi',
  'trina',
  'ja-solar',
  'jasolar',
  'hoymiles',
  'pylon',
  'pylontech',
  'schletter',
  'epever',
  'srne',
  'tensite',
  'studer',
  'kolos',
  'canadian',
];

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[mm[1]] = v;
  }
  return out;
}

function brandFromPath(img) {
  const n = norm(img);
  for (const b of MARCAS) {
    if (n.includes(b)) return b;
  }
  return '';
}

function brandKey(brand) {
  const n = norm(brand).replace(/\s+/g, '');
  if (n.includes('jasolar') || n === 'ja') return 'ja-solar';
  if (n.includes('pylon')) return 'pylon';
  return n;
}

function tipoMismatch(category, title, img) {
  const nImg = norm(img);
  const nTitle = norm(title);
  if (category === 'accesorios' || /medidor|dongle|datalogger|logger/.test(nTitle)) {
    if (/\/inversores\//.test(nImg) || /hybrid|hibrido|sdt|es\.jpg/.test(nImg)) {
      return 'accesorio/medidor con imagen de inversor';
    }
    if (/growatt/.test(nImg) && /goodwe/.test(nTitle)) {
      return 'marca en imagen distinta (Growatt vs GoodWe)';
    }
  }
  if (category === 'inversores') {
    if (/\/baterias\//.test(nImg) || /\/monitoreo\//.test(nImg)) {
      return 'inversor con imagen de otra categoría';
    }
    // XS series vs SDT/ES hybrid photos
    if (/xs-?\d|dns|ms-us/.test(nTitle) && /sdt|es\.jpg|hybrid|hibrido|et\.jpg/.test(nImg)) {
      return 'on-grid/XS con foto de serie híbrida u otra familia';
    }
  }
  if (category === 'baterias' && /\/inversores\//.test(nImg)) {
    return 'batería con imagen de inversor';
  }
  return '';
}

const files = fs.readdirSync(PROD_DIR).filter((f) => f.endsWith('.md'));
const suspects = [];
const applyFix = new Set([
  'inversor-solar-on-grid-goodwe-3kw-gw3000-xs-30.md',
  'medidor-de-energia-goodwe-gm330.md',
]);

for (const file of files) {
  const full = path.join(PROD_DIR, file);
  const raw = fs.readFileSync(full, 'utf8');
  const fm = parseFrontmatter(raw);
  if (fm.draft === 'true') continue;
  const img = fm.image || '';
  if (!img || /placeholders\//.test(img)) continue;

  const reasons = [];
  const imgBrand = brandFromPath(img);
  const prodBrand = brandKey(fm.brand || '');
  if (imgBrand && prodBrand && imgBrand !== prodBrand && !prodBrand.includes(imgBrand) && !imgBrand.includes(prodBrand)) {
    reasons.push(`marca imagen «${imgBrand}» ≠ marca producto «${fm.brand}»`);
  }
  const tipo = tipoMismatch(fm.category, fm.title, img);
  if (tipo) reasons.push(tipo);

  if (reasons.length) {
    suspects.push({
      file,
      slug: file.replace(/\.md$/, ''),
      title: fm.title,
      brand: fm.brand,
      category: fm.category,
      image: img,
      reasons,
      placeholder: placeholders[fm.category] || '/images/placeholders/accesorios.svg',
    });
  }
}

// Aplicar placeholder solo a casos confirmados (y los de APPLY)
let applied = 0;
for (const s of suspects) {
  if (!applyFix.has(s.file)) continue;
  const full = path.join(PROD_DIR, s.file);
  let raw = fs.readFileSync(full, 'utf8');
  const next = raw.replace(/^image:\s*.*$/m, `image: "${s.placeholder}"`);
  if (next !== raw) {
    fs.writeFileSync(full, next);
    applied += 1;
    s.fixed = true;
  }
}

const lines = [];
lines.push('# Auditoría de imágenes de productos');
lines.push('');
lines.push(`Fecha: ${new Date().toISOString().slice(0, 10)}`);
lines.push('');
lines.push('Criterio: marca en la ruta de la imagen distinta a la del producto, o tipo de equipo');
lines.push('incompatible (ej. medidor con foto de inversor; on-grid XS con foto híbrida SDT/ES).');
lines.push('');
lines.push('**No se borraron archivos de imagen.** Solo se cambió el frontmatter `image` a');
lines.push('placeholder de categoría en los casos confirmados abajo.');
lines.push('');
lines.push(`Sospechosos detectados: **${suspects.length}**`);
lines.push(`Placeholders aplicados en esta corrida: **${applied}**`);
lines.push('');
lines.push('| Producto | Marca | Categoría | Imagen actual | Motivo | Acción |');
lines.push('|---|---|---|---|---|---|');
for (const s of suspects) {
  const accion = s.fixed
    ? `Placeholder \`${s.placeholder}\``
    : 'Pendiente (revisar / no tocar sin OK)';
  lines.push(
    `| ${s.title.replace(/\|/g, '/')} | ${s.brand || '—'} | ${s.category} | \`${s.image}\` | ${s.reasons.join('; ')} | ${accion} |`
  );
}
lines.push('');
lines.push('## Casos confirmados por el dueño');
lines.push('');
lines.push('- GoodWe GW3000-XS-30: tenía `goodwe-sdt.jpg` (familia SDT / aspecto híbrido) → placeholder inversores.');
lines.push('- Medidor GoodWe GM330: tenía `goodwe-ezlogger.jpg` (datalogger; se reportó como dongle Growatt) → placeholder accesorios.');
lines.push('');

const out = path.join(ROOT, 'data', 'auditoria-imagenes.md');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log('Escrito:', out);
console.log('Sospechosos:', suspects.length, '| Placeholders aplicados:', applied);
