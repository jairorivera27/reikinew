/**
 * Aplica NFMI0004 (Solaire) al SKU HMT-2000-4T-208 y genera estudio.
 * Uso: node scripts/_aplicar-nfmi0004.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const srcPng = path.join(ROOT, 'imagenes-originales/proveedores/solaire/NFMI0004.png');
const slug = 'cat-mayorista-d99eecbc0d48';
const mdPath = path.join(ROOT, 'src/content/productos', `${slug}.md`);
const OUT = path.join(ROOT, 'public/images/productos-estudio');
const FICHAS = path.join(ROOT, 'docs/fichas');
const CANVAS = 1600;

async function radialBg(size) {
  const buf = Buffer.alloc(size * size * 3);
  const cx = (size - 1) / 2,
    cy = size * 0.46,
    maxR = size * 0.72;
  const c0 = [255, 255, 255],
    c1 = [0xee, 0xf0, 0xf3];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = Math.min(1, Math.hypot(x - cx, y - cy) / maxR);
      const s = t * t * (3 - 2 * t);
      const i = (y * size + x) * 3;
      buf[i] = Math.round(c0[0] + (c1[0] - c0[0]) * s);
      buf[i + 1] = Math.round(c0[1] + (c1[1] - c0[1]) * s);
      buf[i + 2] = Math.round(c0[2] + (c1[2] - c0[2]) * s);
    }
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

const meta = await sharp(srcPng).metadata();
console.log('source', meta.width, meta.height, 'alpha', meta.hasAlpha);

// PNG con alfa limpio → no IA
const trimmed = await sharp(srcPng)
  .ensureAlpha()
  .trim({ threshold: 8 })
  .png()
  .toBuffer({ resolveWithObject: true });
const tw = trimmed.info.width,
  th = trimmed.info.height;
const maxSide = Math.max(tw, th);
let scale = (CANVAS * 0.8) / maxSide;
if (scale > 1.3) scale = (CANVAS * 0.7) / maxSide;
if (scale > 1.3) scale = 1.3;
const pw = Math.round(tw * scale),
  ph = Math.round(th * scale);
const product = await sharp(trimmed.data)
  .resize(pw, ph, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
  .modulate({ brightness: 1.02 })
  .linear(1.07, -(128 * 0.07))
  .sharpen({ sigma: 0.65, m1: 0.5, m2: 0.3 })
  .ensureAlpha()
  .png()
  .toBuffer();

const bg = await radialBg(CANVAS);
const left = Math.round((CANVAS - pw) / 2);
const top = Math.round((CANVAS - ph) / 2 - CANVAS * 0.015);
const ew = Math.round(pw * 0.7),
  eh = Math.max(18, Math.round(pw * 0.045));
const cy = Math.min(CANVAS - 8, top + ph + Math.round(eh * 0.15));
const shadow = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}"><ellipse cx="${CANVAS / 2}" cy="${cy}" rx="${ew / 2}" ry="${eh / 2}" fill="rgba(18,22,30,0.22)"/></svg>`
  )
)
  .blur(16)
  .png()
  .toBuffer();

const composed = await sharp(bg)
  .composite([
    { input: shadow, left: 0, top: 0 },
    { input: product, left, top },
  ])
  .png()
  .toBuffer();

fs.mkdirSync(OUT, { recursive: true });
const seo = 'hoymiles-hmt-2000-4t-208';
let q = 86;
let buf = await sharp(composed).webp({ quality: q, effort: 5 }).toBuffer();
while (buf.length / 1024 > 150 && q > 72) {
  q -= 2;
  buf = await sharp(composed).webp({ quality: q, effort: 6 }).toBuffer();
}
fs.writeFileSync(path.join(OUT, `${seo}.webp`), buf);
await sharp(composed)
  .resize(600, 600, { fit: 'fill' })
  .webp({ quality: 84 })
  .toFile(path.join(OUT, `${seo}-thumb.webp`));
console.log('webp', (buf.length / 1024).toFixed(1), 'KB q', q);

// PDF ficha
fs.mkdirSync(FICHAS, { recursive: true });
const pdfUrl =
  'https://portal.solaire.com.co/wp-content/uploads/productos-pdf/ITEMS%20DE%20SAP%20PARA%20GLOBAL%20PAGINA/NFMI0004_FICHA.pdf';
try {
  const r = await fetch(pdfUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (r.ok) {
    fs.writeFileSync(
      path.join(FICHAS, 'hoymiles-hmt-2000-4t-208-ficha.pdf'),
      Buffer.from(await r.arrayBuffer())
    );
    console.log('pdf ok');
  }
} catch (e) {
  console.warn('pdf', e.message);
}

// Update MD
let raw = fs.readFileSync(mdPath, 'utf8');
const body = raw.replace(/^---[\s\S]*?---/, '');
const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
const set = (text, key, val) => {
  const line = typeof val === 'boolean' ? `${key}: ${val}` : `${key}: "${val}"`;
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  return re.test(text) ? text.replace(re, line) : `${text}\n${line}`;
};
let f = fm;
f = set(f, 'image', `/images/productos-estudio/${seo}.webp`);
f = set(f, 'imageThumb', `/images/productos-estudio/${seo}-thumb.webp`);
f = set(f, 'imageAlt', 'Hoymiles HMT-2000-4T-208 2kW – Reiki Energía Solar');
f = set(f, 'imageOriginal', 'proveedores/solaire/NFMI0004.png');
f = set(f, 'imagen_provisional', false);
f = set(f, 'imagenPendiente', false);
f = set(f, 'fichaPdf', 'docs/fichas/hoymiles-hmt-2000-4t-208-ficha.pdf');
f = set(f, 'model', 'HMT-2000-4T-208');
fs.writeFileSync(mdPath, `---\n${f}\n---${body}`);

// CSV append
const csvPath = path.join(ROOT, 'docs/fuentes-imagenes.csv');
const header =
  'producto,slug,proveedor,url,resolucion,transparente,marca_agua,estado,match_modelo\n';
const row = `"Hoymiles Microinverter Trifasico HMT-2000-4T-208",${slug},solaire,https://portal.solaire.com.co/wp-content/uploads/2025/12/NFMI0004.png,${meta.width}x${meta.height},sí,no,ok,HMT-2000-4T-208\n`;
if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, header + row);
else {
  const cur = fs.readFileSync(csvPath, 'utf8');
  if (!cur.includes(slug)) fs.appendFileSync(csvPath, row);
}

// preview
await sharp(composed)
  .resize(640, 640)
  .png()
  .toFile(path.join(ROOT, 'docs/piloto-preview', `${seo}.png`));
console.log('done', slug);
