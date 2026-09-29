/**
 * Pipeline "estudio tech premium" para fotos de producto.
 *
 * Uso:
 *   node scripts/procesar-imagenes.mjs --pilot
 *   node scripts/procesar-imagenes.mjs --all
 *   node scripts/procesar-imagenes.mjs --slug <slug>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROD_DIR = path.join(ROOT, 'src', 'content', 'productos');
const ORIG_ROOT = path.join(ROOT, 'imagenes-originales');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'productos-estudio');
const PREVIEW_DIR = path.join(ROOT, 'docs', 'piloto-preview');
const MANIFEST = path.join(ROOT, 'docs', 'procesar-imagenes-manifest.json');
const CONTACT = path.join(ROOT, 'docs', 'contact-sheet.html');
const NOSIRVE = path.join(ROOT, 'docs', 'imagenes-no-sirven.md');

const CANVAS = 1600;
const THUMB = 600;
const FIT_TARGET = 0.8;
const FIT_REDUCED = 0.7;
const MAX_UPSCALE = 1.3;
const WEBP_Q = 87;
const AVIF_Q = 58;
const WHITE_EDGE = 245;
const MIN_SIDE = 1000;

const CAT_ORDER = [
  'paneles',
  'inversores',
  'baterias',
  'controladores',
  'protecciones',
  'bombeo',
  'accesorios',
  'reflectores',
];

const PILOT = [
  {
    slug: 'panel-solar-bifacial-n-type-ja-solar-625w-1002139',
    seoName: 'ja-solar-625w-bifacial',
    source: '/images/productos-tienda/paneles-solares/ja-solar-625w-bifacial.jpg',
  },
  {
    slug: 'inversor-solar-off-grid-tensite-6-5kw-3004117',
    seoName: 'tensite-6-5kw-off-grid',
    source: '/images/productos-tienda/inversores/tensite-inverter.jpg',
  },
  {
    slug: 'bateria-solar-litio-felicity-48v-5-12kwh-1880816',
    seoName: 'felicity-fla48-5-12kwh',
    source: '/images/productos-tienda/baterias/felicity-fla48.jpg',
  },
  {
    slug: 'controlador-de-carga-solar-mppt-inti-60a-6048150',
    seoName: 'inti-mppt-60a',
    source: '/images/productos-tienda/controladores/inti-mppt.jpg',
  },
  {
    slug: 'bomba-solar-1500w-kolos4-60-150-20',
    seoName: 'kolos4-1500w-sumergible',
    source: '/images/productos-tienda/bombeo/kolos4-sumergible.jpg',
  },
];

function parseArgs(argv) {
  const out = { pilot: false, all: false, slugs: [], intiOnly: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pilot') out.pilot = true;
    else if (a === '--all') out.all = true;
    else if (a === '--inti-mask') out.intiOnly = true;
    else if (a === '--slug') out.slugs.push(argv[++i]);
  }
  return out;
}

function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { fm: {}, body: raw, rawFm: '' };
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[mm[1]] = v;
  }
  return { fm: out, body: raw.slice(m[0].length), rawFm: m[1] };
}

function slugifySeo(parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildAlt(fm) {
  const bits = [fm.brand, fm.model || fm.sku, fm.power]
    .map((x) => (x || '').trim())
    .filter(Boolean);
  const core = bits.length ? bits.join(' ') : fm.title || 'Producto';
  return `${core} – Reiki Energía Solar`;
}

function publicToAbs(imagePath) {
  const rel = String(imagePath || '')
    .replace(/^\//, '')
    .replace(/\//g, path.sep);
  return path.join(ROOT, 'public', rel);
}

function isPlaceholder(pub) {
  const p = String(pub || '').toLowerCase();
  return (
    p.endsWith('.svg') ||
    p.includes('/placeholders/') ||
    p.includes('/marcas/') ||
    /\/images\/(livoltek|logo-|longi|growatt|huawei|must|solis|ja_solar)/i.test(p)
  );
}

function resolveSourcePub(fm, job) {
  const cands = [
    job?.source,
    fm.imageOriginal,
    String(fm.image || '').includes('productos-estudio') ? null : fm.image,
  ].filter(Boolean);
  for (const pub of cands) {
    if (String(pub).includes('productos-estudio')) continue;
    const abs = publicToAbs(pub);
    if (fs.existsSync(abs)) return pub;
    const bak = path.join(
      ORIG_ROOT,
      String(pub).replace(/^\//, '').replace(/\//g, path.sep)
    );
    if (fs.existsSync(bak)) return pub;
  }
  return null;
}

function resolveSourceAbs(pub) {
  const abs = publicToAbs(pub);
  if (fs.existsSync(abs) && !String(pub).includes('productos-estudio')) return abs;
  const bak = path.join(
    ORIG_ROOT,
    String(pub).replace(/^\//, '').replace(/\//g, path.sep)
  );
  if (fs.existsSync(bak)) return bak;
  return null;
}

function loadProducts() {
  const files = fs.readdirSync(PROD_DIR).filter((f) => f.endsWith('.md'));
  const list = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(PROD_DIR, f), 'utf8');
    const { fm, body, rawFm } = parseFm(raw);
    if (String(fm.draft) === 'true') continue;
    list.push({
      slug: f.replace(/\.md$/, ''),
      mdPath: path.join(PROD_DIR, f),
      fm,
      body,
      rawFm,
    });
  }
  list.sort((a, b) => {
    const ca = CAT_ORDER.indexOf(a.fm.category);
    const cb = CAT_ORDER.indexOf(b.fm.category);
    const ia = ca < 0 ? 99 : ca;
    const ib = cb < 0 ? 99 : cb;
    if (ia !== ib) return ia - ib;
    return (a.fm.title || '').localeCompare(b.fm.title || '', 'es');
  });
  return list;
}

async function meanEdgeLuma(abs) {
  const { data: buf, info } = await sharp(abs, { failOn: 'none' })
    .ensureAlpha()
    .resize(64, 64, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  let sum = 0;
  let n = 0;
  let opaque = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const a = ch === 4 ? buf[i + 3] : 255;
      if (a > 8) opaque++;
      if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) {
        sum += 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
        n++;
      }
    }
  }
  return { meanEdge: n ? sum / n : 0, opaqueRatio: opaque / (w * h) };
}

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
      buf[i] = Math.round(c0[0] + (c1[0] - c0[0]) * s);
      buf[i + 1] = Math.round(c0[1] + (c1[1] - c0[1]) * s);
      buf[i + 2] = Math.round(c0[2] + (c1[2] - c0[2]) * s);
    }
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toBuffer();
}

async function softShadow(size, productW, productBottomY) {
  const ew = Math.round(productW * 0.7);
  const eh = Math.max(22, Math.round(productW * 0.045));
  const cy = Math.min(size - 8, productBottomY + Math.round(eh * 0.15));
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <ellipse cx="${size / 2}" cy="${cy}" rx="${ew / 2}" ry="${eh / 2}"
    fill="rgba(18,22,30,0.22)" />
</svg>`);
  return sharp(svg).blur(16).png().toBuffer();
}

async function cutWhiteBackgroundFlood(abs) {
  const { data, info } = await sharp(abs, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.from(data);
  const visited = new Uint8Array(w * h);
  const stack = [];

  const isBg = (i) => {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    return luma >= 242 && spread <= 18;
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

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** Intento de quitar pedestal morado / cielo del Inti. */
async function maskIntiPedestal(abs) {
  const { data, info } = await sharp(abs, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.from(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const sky = b > 140 && b > r + 15 && b > g + 5 && luma > 120 && luma < 250;
      const purple = r > 100 && r > g + 15 && b > g + 5 && y > h * 0.45;
      const pinkWood = r > 180 && g > 150 && b > 160 && r > g && Math.abs(r - b) < 40 && y > h * 0.5;
      const mist = luma > 220 && y > h * 0.35 && y < h * 0.85 && (x < w * 0.22 || x > w * 0.78);
      if (sky || purple || pinkWood || mist) out[i + 3] = 0;
    }
  }
  // Evaluación: ¿quedó pedestal? muestrear franja inferior
  let purpleLeft = 0;
  let opaqueBottom = 0;
  for (let y = Math.floor(h * 0.72); y < h; y++) {
    for (let x = Math.floor(w * 0.3); x < Math.floor(w * 0.7); x++) {
      const i = (y * w + x) * ch;
      if (out[i + 3] < 16) continue;
      opaqueBottom++;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      if (r > 100 && r > g + 12 && b > g) purpleLeft++;
    }
  }
  const clean = purpleLeft < 40;
  const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
  return { png, clean, purpleLeft, opaqueBottom };
}

async function removeBackgroundAi(abs) {
  const tmpOut = path.join(
    PREVIEW_DIR,
    `_cutout-${path.basename(abs, path.extname(abs))}-${Date.now()}.png`
  );
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const worker = path.join(__dirname, '_bg-removal-worker.mjs');
  const r = spawnSync(process.execPath, [worker, abs, tmpOut], {
    encoding: 'utf8',
    timeout: 180_000,
    windowsHide: true,
  });
  if (r.status !== 0 || !fs.existsSync(tmpOut)) {
    throw new Error(
      ((r.stderr || r.stdout || '').slice(0, 180) || `exit ${r.status}`)
    );
  }
  const png = fs.readFileSync(tmpOut);
  try {
    fs.unlinkSync(tmpOut);
  } catch {
    /* ignore */
  }
  return png;
}

async function toCutout(abs, meta, edgeStats, opts = {}) {
  if (opts.intiMask) {
    const masked = await maskIntiPedestal(abs);
    fs.writeFileSync(
      path.join(PREVIEW_DIR, 'inti-mask-attempt.png'),
      masked.png
    );
    if (!masked.clean) {
      return { cutout: null, reject: 'Máscara pedestal no limpia (queda morado/humo)' };
    }
    // seguir con IA sobre máscara si hace falta
    const tmp = path.join(PREVIEW_DIR, '_inti-masked-src.png');
    fs.writeFileSync(tmp, masked.png);
    try {
      const ai = await removeBackgroundAi(tmp);
      return { cutout: ai };
    } catch {
      return { cutout: masked.png };
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  }

  if (meta.hasAlpha && edgeStats.opaqueRatio < 0.92) {
    return {
      cutout: await sharp(abs, { failOn: 'none' }).ensureAlpha().png().toBuffer(),
    };
  }
  if (edgeStats.meanEdge >= WHITE_EDGE) {
    return { cutout: await cutWhiteBackgroundFlood(abs) };
  }
  try {
    console.log('  bg-removal IA…');
    return { cutout: await removeBackgroundAi(abs) };
  } catch (err) {
    console.warn('  IA falló, flood blanco:', String(err.message || err).slice(0, 100));
    return { cutout: await cutWhiteBackgroundFlood(abs) };
  }
}

async function composeStudio(cutoutPng) {
  const trimmed = await sharp(cutoutPng)
    .trim({ threshold: 10 })
    .png()
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
    .resize(pw, ph, {
      fit: 'fill',
      kernel: scale > 1 ? sharp.kernel.lanczos3 : sharp.kernel.lanczos3,
    })
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
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: productBuf, left, top },
    ])
    .png()
    .toBuffer();

  return { composed, pw, ph, scale, targetFit, sourceW: tw, sourceH: th };
}

function backupOriginal(absSrc, pubPath) {
  const rel = String(pubPath || '')
    .replace(/^\//, '')
    .replace(/\//g, path.sep);
  const dest = path.join(ORIG_ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest)) fs.copyFileSync(absSrc, dest);
  return dest;
}

async function writeOutputs(seoName, composed) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const base = path.join(OUT_DIR, seoName);
  const webpPath = `${base}.webp`;
  const avifPath = `${base}.avif`;
  const thumbPath = `${base}-thumb.webp`;
  const previewPng = path.join(PREVIEW_DIR, `${seoName}.png`);

  await sharp(composed).webp({ quality: WEBP_Q, effort: 5 }).toFile(webpPath);
  await sharp(composed).avif({ quality: AVIF_Q, effort: 4 }).toFile(avifPath);
  await sharp(composed)
    .resize(THUMB, THUMB, { fit: 'fill' })
    .webp({ quality: 84, effort: 4 })
    .toFile(thumbPath);
  await sharp(composed).resize(640, 640).png().toFile(previewPng);

  const webpKb = Math.round((fs.statSync(webpPath).size / 1024) * 10) / 10;
  return {
    webp: `/images/productos-estudio/${seoName}.webp`,
    avif: `/images/productos-estudio/${seoName}.avif`,
    thumb: `/images/productos-estudio/${seoName}-thumb.webp`,
    preview: `piloto-preview/${seoName}.png`,
    webpKb,
  };
}

function setFmLine(fmText, key, value) {
  const line = `${key}: "${String(value).replace(/"/g, '\\"')}"`;
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  if (re.test(fmText)) return fmText.replace(re, line);
  return `${fmText}\n${line}`;
}

function updateFrontmatter(mdPath, fields) {
  const raw = fs.readFileSync(mdPath, 'utf8');
  const { body, rawFm } = parseFm(raw);
  let fmText = rawFm;
  for (const [k, v] of Object.entries(fields)) {
    if (v == null) continue;
    fmText = setFmLine(fmText, k, v);
  }
  fs.writeFileSync(mdPath, `---\n${fmText}\n---${body}`, 'utf8');
}

function seoForSource(pub, products) {
  if (products.length === 1) {
    const fm = products[0].fm;
    const name = slugifySeo([fm.brand, fm.model || fm.sku, fm.power]);
    if (name && name.length >= 6) return name;
  }
  const base = path.basename(pub, path.extname(pub));
  return slugifySeo([base]) || 'producto';
}

async function processSource(pub, products, { intiMask = false } = {}) {
  const abs = resolveSourceAbs(pub);
  if (!abs) {
    return {
      ok: false,
      reason: 'Archivo ausente',
      pub,
      products,
    };
  }
  if (isPlaceholder(pub)) {
    return { ok: false, reason: 'Placeholder / logo de marca', pub, products };
  }

  const meta = await sharp(abs, { failOn: 'none' }).metadata();
  const side = Math.max(meta.width || 0, meta.height || 0);
  if (side < MIN_SIDE) {
    return {
      ok: false,
      reason: `Resolución ${side}px < ${MIN_SIDE}px`,
      pub,
      products,
      sourceSide: side,
    };
  }

  const edgeStats = await meanEdgeLuma(abs);
  const seoName = seoForSource(pub, products);
  console.log(`→ [${products[0].fm.category}] ${seoName} ← ${pub} (${side}px)`);

  backupOriginal(abs, pub);
  const { cutout, reject } = await toCutout(abs, meta, edgeStats, {
    intiMask: intiMask || /inti-mppt/i.test(pub),
  });
  if (reject || !cutout) {
    return {
      ok: false,
      reason: reject || 'Cutout falló',
      pub,
      products,
      sourceSide: side,
    };
  }

  const { composed, scale, targetFit, sourceW, sourceH } =
    await composeStudio(cutout);
  const outs = await writeOutputs(seoName, composed);

  for (const p of products) {
    updateFrontmatter(p.mdPath, {
      image: outs.webp,
      imageThumb: outs.thumb,
      imageAlt: buildAlt(p.fm),
      imageOriginal: pub,
    });
  }

  return {
    ok: true,
    pub,
    products,
    sourceSide: side,
    scale,
    targetFit,
    sourceW,
    sourceH,
    category: products[0].fm.category,
    title: products[0].fm.title,
    brand: products[0].fm.brand,
    model: products[0].fm.model || products[0].fm.sku,
    ...outs,
  };
}

function writeContactSheet(processed) {
  const byCat = new Map();
  for (const r of processed) {
    const c = r.category || 'otros';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c).push(r);
  }

  const sections = CAT_ORDER.filter((c) => byCat.has(c))
    .map((cat) => {
      const cards = byCat
        .get(cat)
        .map((r) => {
          const afterSrc = r.preview || `../public${r.webp}`;
          const beforeSrc = `../public${r.pub}`;
          return `<article class="card">
  <h3>${escapeHtml(r.title || r.seoName || '')}</h3>
  <p class="meta">${escapeHtml(r.brand || '')} · ${escapeHtml(r.model || '')} · ${r.webpKb} KB · fit ${(r.targetFit * 100).toFixed(0)}% · scale ${Number(r.scale).toFixed(2)}</p>
  <div class="pair">
    <figure><img src="${escapeAttr(beforeSrc)}" alt="antes"/><figcaption>Antes</figcaption></figure>
    <figure><img src="${escapeAttr(afterSrc)}" alt="después"/><figcaption>Después</figcaption></figure>
  </div>
</article>`;
        })
        .join('\n');
      return `<section class="cat">
  <h2>${escapeHtml(cat)} <span>(${byCat.get(cat).length})</span></h2>
  <div class="grid">${cards}</div>
</section>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Contact sheet — estudio tech premium</title>
<style>
  body{margin:0;padding:24px;background:#f4f5f7;color:#1a1d24;font-family:"Segoe UI",system-ui,sans-serif}
  h1{font-size:1.4rem;margin:0 0 6px}
  .sub{color:#5c6570;margin:0 0 28px}
  h2{font-size:1.15rem;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid #dde1e6}
  h2 span{color:#6b7280;font-weight:500;font-size:0.9rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:16px}
  .card{background:#fff;border:1px solid #e4e7eb;border-radius:10px;padding:12px}
  .card h3{font-size:0.9rem;margin:0 0 4px;line-height:1.3}
  .meta{font-size:0.75rem;color:#6b7280;margin:0 0 8px}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  figure{margin:0;background:#eef0f3;border-radius:8px;overflow:hidden}
  img{width:100%;aspect-ratio:1;object-fit:contain;display:block;background:#eef0f3}
  figcaption{font-size:0.7rem;text-align:center;padding:5px;color:#4b5563}
</style>
</head>
<body>
  <h1>Contact sheet — estudio tech premium</h1>
  <p class="sub">Agrupado por categoría · WebP q${WEBP_Q} · max upscale ${MAX_UPSCALE}x · fit 80% (70% si haría falta &gt;1.3x)</p>
  ${sections}
</body>
</html>`;
  fs.writeFileSync(CONTACT, html, 'utf8');
}

function writeNoSirve(rejected) {
  const rows = [];
  for (const r of rejected) {
    for (const p of r.products || []) {
      rows.push({
        title: p.fm.title || p.slug,
        brand: p.fm.brand || '—',
        model: p.fm.model || p.fm.sku || '—',
        power: p.fm.power || '—',
        category: p.fm.category || '—',
        slug: p.slug,
        pub: r.pub || p.fm.imageOriginal || p.fm.image || '—',
        reason: r.reason || '—',
        side: r.sourceSide ?? '—',
      });
    }
  }
  rows.sort((a, b) => {
    const ca = CAT_ORDER.indexOf(a.category);
    const cb = CAT_ORDER.indexOf(b.category);
    if (ca !== cb) return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb);
    return a.brand.localeCompare(b.brand, 'es') || a.model.localeCompare(b.model, 'es');
  });

  const lines = [
    '# Imágenes que NO sirven',
    '',
    `Actualizado: ${new Date().toISOString().slice(0, 10)}`,
    '',
    'Fuentes descartadas (sin upscale artificial). Conseguir foto oficial del fabricante ≥1000 px, fondo limpio, sin marketing de terceros.',
    '',
    `| # | Marca | Modelo / SKU | Potencia | Categoría | Producto | Fuente | Motivo |`,
    `|---|---|---|---|---|---|---|---|`,
    ...rows.map(
      (r, i) =>
        `| ${i + 1} | ${r.brand} | ${r.model} | ${r.power} | ${r.category} | ${r.title} | \`${r.pub}\` | ${r.reason} |`
    ),
    '',
    '## Notas de arte',
    '',
    '- Controlador Inti / EPEVER Tracer: máscara por color del pedestal morado **no quedó limpia** (pedestal + humo/halo). Pedir PNG oficial sin escena.',
    '- Hoymiles HMS genérico: gráfico Solux/marketing, no foto de estudio del modelo de ficha.',
    '',
  ];
  fs.writeFileSync(NOSIRVE, lines.join('\n'), 'utf8');
  return rows.length;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

async function tryIntiOnly() {
  const pub = '/images/productos-tienda/controladores/inti-mppt.jpg';
  const abs = resolveSourceAbs(pub);
  const r = await maskIntiPedestal(abs);
  fs.writeFileSync(path.join(PREVIEW_DIR, 'inti-mask-attempt.png'), r.png);
  console.log('Inti mask clean?', r.clean, 'purpleLeft', r.purpleLeft);
  return r.clean;
}

async function main() {
  const args = parseArgs(process.argv);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(ORIG_ROOT, { recursive: true });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  if (args.intiOnly) {
    await tryIntiOnly();
    return;
  }

  const allProducts = loadProducts();
  let jobs = [];

  if (args.slugs.length) {
    jobs = allProducts.filter((p) => args.slugs.includes(p.slug));
  } else if (args.pilot) {
    const set = new Set(PILOT.map((p) => p.slug));
    jobs = allProducts.filter((p) => set.has(p.slug));
    for (const p of jobs) {
      const meta = PILOT.find((x) => x.slug === p.slug);
      if (meta?.source) p._forceSource = meta.source;
    }
  } else if (args.all) {
    jobs = allProducts;
  } else {
    console.error('Usa --pilot | --all | --slug');
    process.exit(1);
  }

  // Agrupar por fuente original
  const bySource = new Map();
  const missingSource = [];
  for (const p of jobs) {
    const pub = p._forceSource || resolveSourcePub(p.fm, null);
    if (!pub) {
      missingSource.push({
        ok: false,
        reason: 'Sin fuente original resoluble',
        pub: p.fm.image || '',
        products: [p],
      });
      continue;
    }
    if (!bySource.has(pub)) bySource.set(pub, []);
    bySource.get(pub).push(p);
  }

  // Ordenar fuentes por categoría del primer producto
  const sourceEntries = [...bySource.entries()].sort((a, b) => {
    const ca = CAT_ORDER.indexOf(a[1][0].fm.category);
    const cb = CAT_ORDER.indexOf(b[1][0].fm.category);
    return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb);
  });

  const processed = [];
  const rejected = [...missingSource];
  let i = 0;
  for (const [pub, products] of sourceEntries) {
    i++;
    console.log(`\n[${i}/${sourceEntries.length}] ${products.length} SKU(s)`);
    try {
      const r = await processSource(pub, products, {
        intiMask: /inti-mppt/i.test(pub),
      });
      if (r.ok) processed.push(r);
      else rejected.push(r);
    } catch (err) {
      console.error('ERROR', pub, err.message || err);
      rejected.push({
        ok: false,
        reason: String(err.message || err).slice(0, 200),
        pub,
        products,
      });
    }
  }

  writeContactSheet(processed);
  const discardCount = writeNoSirve(rejected);

  const summary = {
    at: new Date().toISOString(),
    fuentesUnicas: sourceEntries.length,
    procesadas: processed.length,
    descartadasFuentes: rejected.length,
    descartadasSkus: discardCount,
    skusActualizados: processed.reduce((n, r) => n + r.products.length, 0),
    webpQ: WEBP_Q,
    maxUpscale: MAX_UPSCALE,
    processed,
    rejected: rejected.map((r) => ({
      pub: r.pub,
      reason: r.reason,
      skus: (r.products || []).map((p) => p.slug),
    })),
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(summary, null, 2));

  console.log('\n========== RESUMEN ==========');
  console.log('Fuentes únicas:', sourceEntries.length);
  console.log('Procesadas (estudio):', processed.length);
  console.log('Descartadas (fuentes):', rejected.length);
  console.log('SKUs actualizados:', summary.skusActualizados);
  console.log('SKUs en no-sirven:', discardCount);
  console.log('Contact sheet:', path.relative(ROOT, CONTACT));
  console.log('No sirven:', path.relative(ROOT, NOSIRVE));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
