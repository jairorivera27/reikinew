/**
 * Lote 1 — fotos de proveedor (Solaire / Autosolar) en estilo estudio.
 *
 * Lee docs/lote1-decisiones.json ({ slug: { src, match, serieRef } }),
 * procesa cada fuente única con la misma receta de scripts/procesar-imagenes.mjs
 * (lienzo 1600, fondo radial #FFF→#EEF0F3, sombra de contacto, fit 80 %,
 * máx. 1.3× de ampliación, WebP q87 + thumb 600) y actualiza el frontmatter.
 *
 * Uso:
 *   node scripts/lote1-proveedores.mjs            # procesa y escribe
 *   node scripts/lote1-proveedores.mjs --dry-run  # solo informa
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROD_DIR = path.join(ROOT, 'src', 'content', 'productos');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'productos-estudio');
const argVal = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
// --lote 2 → docs/lote2-decisiones.json / docs/lote2-reporte.json
const LOTE = argVal('--lote', '1');
const DECISIONES = path.join(ROOT, 'docs', `lote${LOTE}-decisiones.json`);
const REPORTE = path.join(ROOT, 'docs', `lote${LOTE}-reporte.json`);
const DRY = process.argv.includes('--dry-run');

const CANVAS = 1600;
const THUMB = 600;
const FIT_TARGET = 0.8;
const FIT_REDUCED = 0.7;
const MAX_UPSCALE = 1.3;
const WEBP_Q = 87;
const MAX_KB = 150;

// ---------- receta estudio (idéntica a procesar-imagenes.mjs) ----------
async function radialBackground(size) {
  const buf = Buffer.alloc(size * size * 3);
  const cx = (size - 1) / 2;
  const cy = size * 0.46;
  const maxR = size * 0.72;
  const c0 = [255, 255, 255];
  const c1 = [0xee, 0xf0, 0xf3];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxR);
      const s = t * t * (3 - 2 * t);
      const i = (y * size + x) * 3;
      for (let k = 0; k < 3; k++) buf[i + k] = Math.round(c0[k] + (c1[k] - c0[k]) * s);
    }
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

async function softShadow(size, productW, productBottomY) {
  const ew = Math.round(productW * 0.7);
  const eh = Math.max(22, Math.round(productW * 0.045));
  const cy = Math.min(size - 8, productBottomY + Math.round(eh * 0.15));
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <ellipse cx="${size / 2}" cy="${cy}" rx="${ew / 2}" ry="${eh / 2}" fill="rgba(18,22,30,0.22)" /></svg>`);
  return sharp(svg).blur(16).png().toBuffer();
}

/** Quita fondo blanco por inundación desde los bordes (no toca blancos interiores). */
async function cutWhiteBackgroundFlood(input) {
  const { data, info } = await sharp(input, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.from(data);
  const visited = new Uint8Array(w * h);
  const stack = [];
  const isBg = (i) => {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma >= 242 && Math.max(r, g, b) - Math.min(r, g, b) <= 18;
  };
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    visited[p] = 1;
    const i = p * ch;
    if (!isBg(i)) return;
    out[i + 3] = 0;
    stack.push(x, y);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function toCutout(src) {
  const meta = await sharp(src).metadata();
  if (meta.hasAlpha) {
    const { data, info } = await sharp(src).ensureAlpha().resize(64, 64, { fit: 'fill' }).raw()
      .toBuffer({ resolveWithObject: true });
    let transparent = 0;
    for (let i = 3; i < data.length; i += info.channels) if (data[i] < 8) transparent++;
    if (transparent / (64 * 64) > 0.05) {
      return { cutout: await sharp(src).ensureAlpha().png().toBuffer(), metodo: 'alfa' };
    }
  }
  return { cutout: await cutWhiteBackgroundFlood(src), metodo: 'fondo-blanco' };
}

async function composeStudio(cutoutPng) {
  const trimmed = await sharp(cutoutPng).trim({ threshold: 10 }).png()
    .toBuffer({ resolveWithObject: true });
  const tw = trimmed.info.width;
  const th = trimmed.info.height;
  const maxSide = Math.max(tw, th);
  let targetFit = FIT_TARGET;
  let scale = (CANVAS * targetFit) / maxSide;
  if (scale > MAX_UPSCALE) {
    targetFit = FIT_REDUCED;
    scale = (CANVAS * targetFit) / maxSide;
  }
  if (scale > MAX_UPSCALE) scale = MAX_UPSCALE;
  const pw = Math.max(1, Math.round(tw * scale));
  const ph = Math.max(1, Math.round(th * scale));
  const productBuf = await sharp(trimmed.data)
    .resize(pw, ph, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .modulate({ brightness: 1.02, saturation: 1.0 })
    .linear(1.07, -(128 * 0.07))
    .sharpen({ sigma: 0.65, m1: 0.5, m2: 0.3 })
    .ensureAlpha()
    .png()
    .toBuffer();
  const bg = await radialBackground(CANVAS);
  const left = Math.round((CANVAS - pw) / 2);
  const top = Math.round((CANVAS - ph) / 2 - CANVAS * 0.015);
  const shadow = await softShadow(CANVAS, pw, top + ph);
  const composed = await sharp(bg)
    .composite([{ input: shadow, left: 0, top: 0 }, { input: productBuf, left, top }])
    .png()
    .toBuffer();
  return { composed, scale, targetFit, sourceW: tw, sourceH: th };
}

/**
 * Equipos BLANCOS sobre fondo blanco (Growatt, Huawei LUNA): el recorte por
 * inundación se come los bordes de la carcasa. Se fusiona la foto completa en
 * modo "multiply" sobre el fondo de estudio: el blanco desaparece y se
 * conservan sombras y contornos.
 */
async function composeMultiply(src) {
  const norm = await sharp(src).flatten({ background: '#ffffff' })
    .linear(255 / 252, 0) // lleva un fondo 252–254 a 255 exacto
    .png().toBuffer();
  const trimmed = await sharp(norm).trim({ threshold: 6 }).png().toBuffer({ resolveWithObject: true });
  const tw = trimmed.info.width;
  const th = trimmed.info.height;
  let targetFit = FIT_TARGET;
  let scale = (CANVAS * targetFit) / Math.max(tw, th);
  if (scale > MAX_UPSCALE) {
    targetFit = FIT_REDUCED;
    scale = (CANVAS * targetFit) / Math.max(tw, th);
  }
  if (scale > MAX_UPSCALE) scale = MAX_UPSCALE;
  const pw = Math.round(tw * scale);
  const ph = Math.round(th * scale);
  const productBuf = await sharp(trimmed.data)
    .resize(pw, ph, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .linear(1.05, -(128 * 0.05))
    .sharpen({ sigma: 0.65, m1: 0.5, m2: 0.3 })
    .png().toBuffer();
  const bg = await radialBackground(CANVAS);
  const left = Math.round((CANVAS - pw) / 2);
  const top = Math.round((CANVAS - ph) / 2 - CANVAS * 0.015);
  const shadow = await softShadow(CANVAS, pw, top + ph);
  const composed = await sharp(bg)
    .composite([{ input: shadow, left: 0, top: 0 }, { input: productBuf, left, top, blend: 'multiply' }])
    .png().toBuffer();
  return { composed, scale, targetFit, sourceW: tw, sourceH: th };
}

const PRODUCTO_BLANCO = /growatt|NFAC0003|felicity|\/(300[0-9]{4}|320[0-9]{4}|188[0-9]{4})\//i;

async function writeOutputs(seoName, composed) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const webpPath = path.join(OUT_DIR, `${seoName}.webp`);
  const thumbPath = path.join(OUT_DIR, `${seoName}-thumb.webp`);
  let q = WEBP_Q;
  await sharp(composed).webp({ quality: q, effort: 5 }).toFile(webpPath);
  while (fs.statSync(webpPath).size / 1024 > MAX_KB && q > 72) {
    q -= 5;
    await sharp(composed).webp({ quality: q, effort: 6 }).toFile(webpPath);
  }
  await sharp(composed).resize(THUMB, THUMB).webp({ quality: 84, effort: 4 }).toFile(thumbPath);
  return {
    webp: `/images/productos-estudio/${seoName}.webp`,
    thumb: `/images/productos-estudio/${seoName}-thumb.webp`,
    kb: Math.round(fs.statSync(webpPath).size / 102.4) / 10,
    q,
  };
}

// ---------- frontmatter ----------
const q = (s) => JSON.stringify(String(s));

function setField(fm, key, value) {
  const re = new RegExp(`^${key}:.*$`, 'm');
  const line = `${key}: ${value}`;
  return re.test(fm) ? fm.replace(re, line) : `${fm.replace(/\n$/, '')}\n${line}\n`;
}
function dropField(fm, key) {
  return fm.replace(new RegExp(`^${key}:.*\\n?`, 'm'), '');
}
function getField(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return m ? m[1].replace(/^"|"$/g, '') : undefined;
}

// Código Solaire → modelo (verificado en portal.solaire.com.co/categoria-producto/huawei)
const SOLAIRE_MODELOS = {
  NFIN0005: 'huawei-sun2000-5ktl-l1', NFIN0006: 'huawei-sun2000-4ktl-l1', NFIN0007: 'huawei-sun2000-3ktl-l1',
  NFIN0008: 'huawei-sun2000-6ktl-l1', NFIN0018: 'huawei-sun2000-2ktl-l1', NFIN0041: 'huawei-sun2000-8k-lc0',
  NFIN0044: 'huawei-sun2000-10k-lc0', NFIN0001: 'huawei-sun2000-40ktl-m3', NFIN0002: 'huawei-sun2000-30ktl-m3',
  NFIN0030: 'huawei-sun2000-36ktl-m3', NFIN0031: 'huawei-sun2000-20ktl-m3', NFIN0063: 'huawei-sun2000-50ktl-m3',
  NFIN0054: 'huawei-sun2000-100ktl-m2', NFIN0009: 'huawei-sun2000-215ktl-h0', NFIN0070: 'huawei-sun2000-330ktl-h1',
  NFAC0003: 'huawei-luna2000-10kw-c1',
};

function seoNameFor(src) {
  const base = path.basename(src).replace(/\.(png|jpe?g|webp)$/i, '').replace(/^\d+-/, '');
  const code = base.match(/^(NF(?:IN|AC)\d+)/i);
  if (code && SOLAIRE_MODELOS[code[1].toUpperCase()]) return SOLAIRE_MODELOS[code[1].toUpperCase()];
  return base
    .replace(/-victron-energy$/, '')
    .replace(/-[0-9a-f]{13}$/, '')
    .replace(/^controlador-carga-/, 'victron-')
    .replace(/^inversor-on-grid-\d+w-/, '')
    .replace(/^inversor-(?=.*(multiplus|phoenix|quattro))/, 'victron-')
    .replace(/^inversor-(on-grid-|red-)?/, 'inversor-')
    .replace(/^multiplus-ii-48500070-95-120v/, 'victron-multiplus-ii-48-5000')
    .replace(/^victron-multiplus-compact-12v-2000va.*$/, 'victron-multiplus-compact-12-2000')
    .toLowerCase();
}

// ---------- main ----------
const decisiones = JSON.parse(fs.readFileSync(DECISIONES, 'utf8'));
const porFuente = new Map();
for (const [slug, d] of Object.entries(decisiones)) {
  if (!porFuente.has(d.src)) porFuente.set(d.src, []);
  porFuente.get(d.src).push(slug);
}

const reporte = { fuentes: [], productos: [] };
for (const [src, slugs] of porFuente) {
  const abs = path.join(ROOT, src);
  if (!fs.existsSync(abs)) {
    console.warn('Falta fuente', src);
    continue;
  }
  const seo = seoNameFor(src);
  let comp;
  let metodo;
  if (PRODUCTO_BLANCO.test(src)) {
    comp = await composeMultiply(abs);
    metodo = 'multiply';
  } else {
    const c = await toCutout(abs);
    metodo = c.metodo;
    comp = await composeStudio(c.cutout);
  }
  const out = DRY ? { webp: '(dry)', thumb: '(dry)', kb: 0, q: 0 } : await writeOutputs(seo, comp.composed);
  reporte.fuentes.push({ src, seo, metodo, ...out, scale: +comp.scale.toFixed(2), fit: comp.targetFit, slugs });
  console.log(`${seo.padEnd(48)} ${metodo.padEnd(13)} ${String(out.kb).padStart(6)} KB  x${comp.scale.toFixed(2)}  → ${slugs.length} SKU`);

  for (const slug of slugs) {
    const mdPath = path.join(PROD_DIR, `${slug}.md`);
    if (!fs.existsSync(mdPath)) {
      console.warn('  sin ficha', slug);
      continue;
    }
    const raw = fs.readFileSync(mdPath, 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!m) continue;
    let fm = `${m[1]}\n`;
    const d = decisiones[slug];
    const antes = { image: getField(fm, 'image'), draft: getField(fm, 'draft') };
    const title = getField(fm, 'title') || slug;
    const brand = getField(fm, 'brand') || '';
    const alt = `${title.startsWith(brand) ? title : `${brand} ${title}`.trim()} – Reiki Energía Solar`;

    fm = setField(fm, 'image', q(out.webp));
    fm = setField(fm, 'imageThumb', q(out.thumb));
    fm = setField(fm, 'imageAlt', q(alt));
    fm = setField(fm, 'imageOriginal', q(src.replace(/^imagenes-/, '')));
    fm = setField(fm, 'imagen_provisional', 'false');
    if (d.match === 'serie' && d.serieRef) fm = setField(fm, 'imagenSerieRef', q(d.serieRef));
    else fm = dropField(fm, 'imagenSerieRef');
    // Solo reactivar lo que se ocultó por falta de foto (G1/G2), nunca otras decisiones de negocio.
    let reactivado = false;
    if (getField(fm, 'draft') === 'true' && getField(fm, 'imagenPendiente') === 'true') {
      fm = dropField(fm, 'draft');
      fm = dropField(fm, 'imagenPendiente');
      reactivado = true;
    }
    if (!DRY) fs.writeFileSync(mdPath, `---\n${fm.replace(/\n+$/, '')}\n---\n${raw.slice(m[0].length)}`);
    reporte.productos.push({ slug, title, match: d.match, serieRef: d.serieRef || null, antes, despues: out.webp, reactivado });
  }
}
if (!DRY) fs.writeFileSync(REPORTE, JSON.stringify(reporte, null, 1));
const r = reporte.productos;
console.log(`\nProductos: ${r.length} · exactos ${r.filter((x) => x.match === 'exacto').length} · serie ${r.filter((x) => x.match === 'serie').length} · reactivados ${r.filter((x) => x.reactivado).length}`);
