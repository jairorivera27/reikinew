/**
 * Fase C: reemplazo de fotos desde Solaire / Autosolar (match marca+modelo exacto).
 *
 * Prioridad: home/descuento → controladores/bombeo → inversores/baterías → resto.
 * Descarga a imagenes-originales/proveedores/{solaire|autosolar}/
 * Manifest: docs/fuentes-imagenes.csv
 * PDFs Solaire → docs/fichas/
 *
 * Uso:
 *   node scripts/fase-c-proveedores.mjs
 *   node scripts/fase-c-proveedores.mjs --limit 20
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROD_DIR = path.join(ROOT, 'src', 'content', 'productos');
const ORIG_PROV = path.join(ROOT, 'imagenes-originales', 'proveedores');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'productos-estudio');
const FICHAS = path.join(ROOT, 'docs', 'fichas');
const CSV = path.join(ROOT, 'docs', 'fuentes-imagenes.csv');
const CONTACT = path.join(ROOT, 'docs', 'contact-sheet-proveedores.html');
const METRICS = path.join(ROOT, 'docs', 'metricas-imagenes.md');
const SIN_MATCH = path.join(ROOT, 'docs', 'proveedores-sin-coincidencia.md');

const CANVAS = 1600;
const THUMB = 600;
const MAX_UPSCALE = 1.3;
const FIT_TARGET = 0.8;
const FIT_REDUCED = 0.7;
const WEBP_Q = 86;
const MAX_KB = 150;
const MIN_SIDE = 1000;
const WHITE_EDGE = 245;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parseArgs() {
  const out = { limit: 15, maxAttempts: 40 };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--limit') out.limit = Number(process.argv[++i]) || 15;
    else if (process.argv[i] === '--max-attempts')
      out.maxAttempts = Number(process.argv[++i]) || 40;
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[mm[1]] = v;
  }
  return { fm: out, body: raw.slice(m[0].length), rawFm: m[1] };
}

function setFmLine(fmText, key, value) {
  let line;
  if (typeof value === 'boolean') line = `${key}: ${value}`;
  else if (value === null) {
    // remove key
    return fmText
      .split(/\r?\n/)
      .filter((l) => !new RegExp(`^${key}:`).test(l))
      .join('\n');
  } else line = `${key}: "${String(value).replace(/"/g, '\\"')}"`;
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  if (re.test(fmText)) return fmText.replace(re, line);
  return `${fmText}\n${line}`;
}

function updateMd(mdPath, fields) {
  const raw = fs.readFileSync(mdPath, 'utf8');
  const { body, rawFm } = parseFm(raw);
  let fm = rawFm;
  for (const [k, v] of Object.entries(fields)) fm = setFmLine(fm, k, v);
  fs.writeFileSync(mdPath, `---\n${fm}\n---${body}`, 'utf8');
}

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function slugify(parts) {
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

function extractModelCandidates(fm) {
  const cands = new Set();
  for (const x of [fm.model, fm.sku, fm.title, fm.power]) {
    if (!x) continue;
    cands.add(norm(x));
    // tokens tipo HMT-2000-4T-208
    for (const m of String(x).matchAll(
      /\b([A-Z]{2,}[A-Z0-9]*[-/][A-Z0-9][-A-Z0-9./]*)\b/gi
    )) {
      cands.add(norm(m[1]));
    }
  }
  // del título: HMT-2000-4T-208
  const t = String(fm.title || '');
  for (const m of t.matchAll(/\b((?:HMT|HMS|GW|SUN|FLA|SCC|PMP)[A-Z0-9./-]*)\b/gi)) {
    cands.add(norm(m[1]));
  }
  return [...cands].filter((c) => c.length >= 5);
}

function loadProducts() {
  const list = [];
  for (const f of fs.readdirSync(PROD_DIR).filter((x) => x.endsWith('.md'))) {
    const mdPath = path.join(PROD_DIR, f);
    const raw = fs.readFileSync(mdPath, 'utf8');
    const { fm } = parseFm(raw);
    if (String(fm.draft) === 'true') continue;
    list.push({
      slug: f.replace(/\.md$/, ''),
      mdPath,
      fm,
      models: extractModelCandidates(fm),
    });
  }
  return list;
}

function priorityScore(p) {
  let s = 0;
  if (p.fm.homeCarouselOrder) s += 1000 - Number(p.fm.homeCarouselOrder);
  if (p.fm.descuentoPct) s += 500 + Number(p.fm.descuentoPct);
  const cat = p.fm.category;
  if (cat === 'controladores' || cat === 'bombeo') s += 400;
  else if (cat === 'inversores' || cat === 'baterias') s += 300;
  else if (cat === 'paneles') s += 200;
  // provisional o imagen débil primero
  if (String(p.fm.imagen_provisional) === 'true') s += 150;
  if (/placeholders\//i.test(p.fm.image || '')) s += 200;
  if (p.fm.imagenPendiente === 'true' || p.fm.imagenPendiente === true) s += 180;
  return s;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function stripWpSize(u) {
  return u.replace(/-\d+x\d+(?=\.(?:png|jpe?g|webp))/i, '');
}

function extractUrls(html) {
  const urls = [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:png|jpe?g|webp|gif|pdf)/gi)].map(
    (m) => m[0].replace(/&amp;/g, '&')
  );
  return [...new Set(urls)];
}

async function searchSolaire(query) {
  const q = encodeURIComponent(query);
  const url = `https://portal.solaire.com.co/?s=${q}&post_type=product`;
  const html = await fetchHtml(url);
  // product links
  const links = [
    ...html.matchAll(
      /https?:\/\/portal\.solaire\.com\.co\/producto\/[a-z0-9-]+\/?/gi
    ),
  ].map((m) => m[0].replace(/\/?$/, '/'));
  const uniq = [...new Set(links)];
  return { searchUrl: url, productUrls: uniq, html };
}

async function loadSolaireProduct(productUrl) {
  const html = await fetchHtml(productUrl);
  const title =
    (html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([^<]+)/i) ||
      html.match(/<title>([^<]+)/i) ||
      [])[1]?.trim() || '';
  const urls = extractUrls(html);
  const imgs = urls
    .filter((u) => /\.(png|jpe?g|webp)/i.test(u))
    .filter((u) => !/logo|cropped-Logos|icon|favicon|avatar/i.test(u))
    .map(stripWpSize);
  const fullImgs = [...new Set(imgs)].filter((u) => /\/uploads\//i.test(u));
  // Prefer codes like NFMI0004.png (product SKU images)
  fullImgs.sort((a, b) => {
    const score = (u) =>
      (/NF[A-Z]{2}\d+/i.test(u) ? 10 : 0) + (/202[4-6]\//.test(u) ? 2 : 0);
    return score(b) - score(a);
  });
  const pdfs = urls.filter(
    (u) => /\.pdf/i.test(u) && /productos-pdf|FICHA|ficha/i.test(u)
  );
  return { productUrl, title, images: fullImgs, pdfs, html };
}

function exactModelMatch(product, solaireTitle, solaireUrl) {
  const hay = norm(solaireTitle + ' ' + solaireUrl);
  for (const m of product.models) {
    if (m.length >= 6 && hay.includes(m)) return m;
  }
  // title contains full model from our title tokens
  const ourTitle = norm(product.fm.title);
  // require HMT20004T208 style overlap
  for (const m of product.models) {
    if (m.length >= 8 && ourTitle.includes(m) && hay.includes(m)) return m;
  }
  return null;
}

async function searchAutosolar(query) {
  const q = encodeURIComponent(query);
  const url = `https://autosolar.co/?s=${q}&post_type=product`;
  try {
    const html = await fetchHtml(url);
    const links = [
      ...html.matchAll(/https?:\/\/(?:www\.)?autosolar\.co\/[^"'\\\s>]+/gi),
    ]
      .map((m) => m[0])
      .filter((u) => /producto|product|tienda/i.test(u));
    return { searchUrl: url, productUrls: [...new Set(links)].slice(0, 8), html };
  } catch {
    return { searchUrl: url, productUrls: [], html: '' };
  }
}

function stripAutosolarThumb(u) {
  return u.replace(/-thumb(?=\.(?:png|jpe?g|webp))/i, '');
}

async function loadAutosolarProduct(productUrl) {
  const html = await fetchHtml(productUrl);
  const title =
    (html.match(/<h1[^>]*>([^<]+)/i) || html.match(/<title>([^<]+)/i) || [])[1]?.trim() ||
    '';
  const urls = extractUrls(html);
  const imgs = [...new Set(urls.filter((u) => /\.(png|jpe?g|webp)/i.test(u)).map(stripAutosolarThumb))]
    .filter((u) => !/logo|icon|favicon|banner/i.test(u));
  return { productUrl, title, images: imgs.slice(0, 8), pdfs: [] };
}

async function download(url, destAbs) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destAbs, buf);
  return buf;
}

async function analyzeImage(abs) {
  const meta = await sharp(abs, { failOn: 'none' }).metadata();
  const side = Math.max(meta.width || 0, meta.height || 0);
  const hasAlpha = Boolean(meta.hasAlpha);
  let opaqueRatio = 1;
  if (hasAlpha) {
    const { data, info } = await sharp(abs)
      .ensureAlpha()
      .resize(64, 64, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let op = 0;
    for (let i = 3; i < data.length; i += info.channels) if (data[i] > 8) op++;
    opaqueRatio = op / (info.width * info.height);
  }
  // Heurística simple de marca de agua / texto: no IA; flag manual si logo solaire en corners
  let watermark = false;
  try {
    const { data, info } = await sharp(abs)
      .resize(80, 80, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    // corner variance low + mid contrast text bands — crude
    // Prefer: reject if filename is logo
    if (/logo|solaire|autosolar|watermark/i.test(abs)) watermark = true;
  } catch {
    /* */
  }
  return {
    width: meta.width || 0,
    height: meta.height || 0,
    side,
    format: meta.format,
    hasAlpha,
    transparent: hasAlpha && opaqueRatio < 0.92,
    watermark,
  };
}

async function meanEdge(abs) {
  const { data: buf, info } = await sharp(abs, { failOn: 'none' })
    .ensureAlpha()
    .resize(64, 64, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  let opaque = 0;
  const { width: w, height: h, channels: ch } = info;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      if ((ch === 4 ? buf[i + 3] : 255) > 8) opaque++;
      if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) {
        sum += 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
        n++;
      }
    }
  }
  return { meanEdge: n ? sum / n : 0, opaqueRatio: opaque / (w * h) };
}

async function floodWhite(abs) {
  const { data, info } = await sharp(abs, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.from(data);
  const visited = new Uint8Array(w * h);
  const stack = [];
  const isBg = (i) => {
    const r = out[i],
      g = out[i + 1],
      b = out[i + 2];
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

async function aiCutout(abs) {
  const tmp = path.join(ROOT, 'docs', 'piloto-preview', `_c-cut-${Date.now()}.png`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  const worker = path.join(__dirname, '_bg-removal-worker.mjs');
  const r = spawnSync(process.execPath, [worker, abs, tmp], {
    encoding: 'utf8',
    timeout: 120000,
    windowsHide: true,
  });
  if (r.status !== 0 || !fs.existsSync(tmp)) throw new Error('ai');
  const buf = fs.readFileSync(tmp);
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* */
  }
  return buf;
}

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

async function softShadow(size, pw, bottom) {
  const ew = Math.round(pw * 0.7);
  const eh = Math.max(18, Math.round(pw * 0.045));
  const cy = Math.min(size - 8, bottom + Math.round(eh * 0.15));
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><ellipse cx="${size / 2}" cy="${cy}" rx="${ew / 2}" ry="${eh / 2}" fill="rgba(18,22,30,0.22)"/></svg>`
  );
  return sharp(svg).blur(16).png().toBuffer();
}

async function composeStudio(cutout) {
  const trimmed = await sharp(cutout)
    .trim({ threshold: 10 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const tw = trimmed.info.width,
    th = trimmed.info.height;
  const maxSide = Math.max(tw, th);
  let fit = FIT_TARGET;
  let scale = (CANVAS * fit) / maxSide;
  if (scale > MAX_UPSCALE) {
    fit = FIT_REDUCED;
    scale = (CANVAS * fit) / maxSide;
  }
  if (scale > MAX_UPSCALE) scale = MAX_UPSCALE;
  const pw = Math.max(1, Math.round(tw * scale));
  const ph = Math.max(1, Math.round(th * scale));
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
  const shadow = await softShadow(CANVAS, pw, top + ph);
  return sharp(bg)
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: product, left, top },
    ])
    .png()
    .toBuffer();
}

async function writeStudio(seo, composed) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const webpPath = path.join(OUT_DIR, `${seo}.webp`);
  const thumbPath = path.join(OUT_DIR, `${seo}-thumb.webp`);
  let q = WEBP_Q;
  let buf = await sharp(composed).webp({ quality: q, effort: 5 }).toBuffer();
  while (buf.length / 1024 > MAX_KB && q > 72) {
    q -= 2;
    buf = await sharp(composed).webp({ quality: q, effort: 6 }).toBuffer();
  }
  fs.writeFileSync(webpPath, buf);
  await sharp(composed)
    .resize(THUMB, THUMB, { fit: 'fill' })
    .webp({ quality: 84 })
    .toFile(thumbPath);
  return {
    webp: `/images/productos-estudio/${seo}.webp`,
    thumb: `/images/productos-estudio/${seo}-thumb.webp`,
    kb: Math.round((buf.length / 1024) * 10) / 10,
  };
}

function csvEscape(s) {
  const t = String(s ?? '');
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function catalogMetrics(products) {
  let definitiva = 0,
    provisional = 0,
    sin = 0;
  for (const p of products) {
    const img = p.fm.image || '';
    const prov = String(p.fm.imagen_provisional) === 'true';
    const pending = String(p.fm.imagenPendiente) === 'true';
    if (/placeholders\//i.test(img) || pending || !img) sin++;
    else if (prov) provisional++;
    else if (/productos-estudio\//i.test(img)) definitiva++;
    else provisional++;
  }
  const total = definitiva + provisional + sin;
  return {
    total,
    definitiva,
    provisional,
    sin,
    pctDef: ((definitiva / total) * 100).toFixed(1),
    pctProv: ((provisional / total) * 100).toFixed(1),
    pctSin: ((sin / total) * 100).toFixed(1),
  };
}

async function processProviderImage(abs, analysis) {
  const edge = await meanEdge(abs);
  let cutout;
  if (analysis.transparent) {
    cutout = await sharp(abs, { failOn: 'none' }).ensureAlpha().png().toBuffer();
  } else if (edge.meanEdge >= WHITE_EDGE) {
    cutout = await floodWhite(abs);
  } else {
    try {
      cutout = await aiCutout(abs);
    } catch {
      cutout = await floodWhite(abs);
    }
  }
  return composeStudio(cutout);
}

async function main() {
  const args = parseArgs();
  const products = loadProducts().sort((a, b) => priorityScore(b) - priorityScore(a));

  // Seed known exact matches (user priority)
  const SEED = [
    {
      slug: 'cat-mayorista-d99eecbc0d48',
      provider: 'solaire',
      productUrl:
        'https://portal.solaire.com.co/producto/hoymiles-microinverter-trifasico-hmt-2000-4t-208/',
      modelKey: 'HMT20004T208',
    },
  ];

  const csvRows = [
    [
      'producto',
      'slug',
      'proveedor',
      'url',
      'resolucion',
      'transparente',
      'marca_agua',
      'estado',
      'match_modelo',
    ].join(','),
  ];
  const replaced = [];
  const noMatch = [];
  const discarded = [];

  let processed = 0;
  let attempts = 0;

  // 1) Seeds first
  for (const seed of SEED) {
    if (processed >= args.limit) break;
    attempts++;
    const p = products.find((x) => x.slug === seed.slug);
    if (!p) {
      noMatch.push({ ...seed, reason: 'slug no encontrado' });
      continue;
    }
    console.log(`SEED ${p.slug} ← ${seed.provider}`);
    try {
      const page = await loadSolaireProduct(seed.productUrl);
      const matched = exactModelMatch(p, page.title, seed.productUrl);
      if (!matched && !norm(page.title).includes('HMT20004T208')) {
        noMatch.push({ slug: p.slug, title: p.fm.title, reason: 'sin coincidencia exacta', provider: 'solaire' });
        continue;
      }
      const imgUrl = page.images[0];
      if (!imgUrl) {
        discarded.push({ slug: p.slug, reason: 'sin imagen' });
        continue;
      }
      const dest = path.join(ORIG_PROV, 'solaire', path.basename(imgUrl.split('?')[0]));
      await download(imgUrl, dest);
      const analysis = await analyzeImage(dest);
      csvRows.push(
        [
          csvEscape(p.fm.title),
          p.slug,
          'solaire',
          csvEscape(imgUrl),
          `${analysis.width}x${analysis.height}`,
          analysis.transparent ? 'sí' : 'no',
          analysis.watermark ? 'sí' : 'no',
          analysis.side < MIN_SIDE ? 'descartada_res' : 'ok',
          matched || 'HMT-2000-4T-208',
        ].join(',')
      );
      if (analysis.side < MIN_SIDE || analysis.watermark) {
        discarded.push({ slug: p.slug, reason: analysis.watermark ? 'marca de agua' : 'baja res', analysis });
        continue;
      }
      // PDF ficha
      for (const pdf of page.pdfs.filter((u) => /FICHA/i.test(u)).slice(0, 1)) {
        const pdfName = `${slugify([p.fm.brand, matched || p.fm.sku, 'ficha'])}.pdf`;
        try {
          await download(pdf, path.join(FICHAS, pdfName));
          updateMd(p.mdPath, { fichaPdf: `/docs/fichas/${pdfName}` });
        } catch (e) {
          console.warn('  PDF fail', e.message);
        }
      }
      const composed = await processProviderImage(dest, analysis);
      const seo = slugify([p.fm.brand, matched || p.fm.sku || p.fm.model, p.fm.power]);
      const outs = await writeStudio(seo, composed);
      updateMd(p.mdPath, {
        image: outs.webp,
        imageThumb: outs.thumb,
        imageAlt: `${[p.fm.brand, matched || p.fm.model, p.fm.power].filter(Boolean).join(' ')} – Reiki Energía Solar`,
        imageOriginal: `proveedores/solaire/${path.basename(dest)}`,
        imagen_provisional: false,
        imagenPendiente: false,
      });
      // remove provisional key properly
      updateMd(p.mdPath, { imagen_provisional: false });
      replaced.push({
        slug: p.slug,
        title: p.fm.title,
        provider: 'solaire',
        webp: outs.webp,
        kb: outs.kb,
        url: imgUrl,
      });
      processed++;
      console.log(`  OK ${outs.webp} ${outs.kb}KB`);
    } catch (err) {
      console.error('  FAIL', err.message);
      discarded.push({ slug: p.slug, reason: err.message });
    }
  }

  // 2) Broader search for top-priority SKUs still provisional / weak
  const candidates = products.filter((p) => {
    if (SEED.some((s) => s.slug === p.slug)) return false;
    const weak =
      String(p.fm.imagen_provisional) === 'true' ||
      /placeholders\//i.test(p.fm.image || '') ||
      String(p.fm.imagenPendiente) === 'true' ||
      ['controladores', 'bombeo', 'inversores', 'baterias'].includes(p.fm.category);
    return weak && p.models.length;
  });

  for (const p of candidates) {
    if (processed >= args.limit) break;
    const query =
      p.models.sort((a, b) => b.length - a.length)[0] ||
      `${p.fm.brand} ${p.fm.model || p.fm.sku || ''}`.trim();
    if (!query || query.length < 4) {
      noMatch.push({ slug: p.slug, title: p.fm.title, reason: 'sin modelo searchable' });
      continue;
    }

    console.log(`\n→ ${p.slug} query=${query}`);
    let matchedPage = null;
    let provider = null;
    let matchedModel = null;

    try {
      const sol = await searchSolaire(
        (p.fm.model || p.fm.sku || p.fm.title || '').toString().slice(0, 80)
      );
      for (const u of sol.productUrls.slice(0, 5)) {
        const page = await loadSolaireProduct(u);
        const m = exactModelMatch(p, page.title, u);
        if (m) {
          matchedPage = page;
          provider = 'solaire';
          matchedModel = m;
          break;
        }
      }
    } catch (e) {
      console.warn('  solaire search fail', e.message);
    }

    if (!matchedPage) {
      try {
        const auto = await searchAutosolar(
          `${p.fm.brand || ''} ${p.fm.model || p.fm.sku || ''}`.trim()
        );
        for (const u of auto.productUrls.slice(0, 4)) {
          const page = await loadAutosolarProduct(u);
          const m = exactModelMatch(p, page.title, u);
          if (m) {
            matchedPage = page;
            provider = 'autosolar';
            matchedModel = m;
            break;
          }
        }
      } catch (e) {
        console.warn('  autosolar fail', e.message);
      }
    }

    if (!matchedPage) {
      noMatch.push({
        slug: p.slug,
        title: p.fm.title,
        brand: p.fm.brand,
        model: p.fm.model || p.fm.sku,
        reason: 'sin coincidencia',
      });
      continue;
    }

    const imgUrl = matchedPage.images[0];
    if (!imgUrl) {
      discarded.push({ slug: p.slug, reason: 'match sin imagen' });
      continue;
    }

    try {
      const dest = path.join(
        ORIG_PROV,
        provider,
        path.basename(decodeURIComponent(imgUrl.split('?')[0]))
      );
      await download(imgUrl, dest);
      const analysis = await analyzeImage(dest);
      csvRows.push(
        [
          csvEscape(p.fm.title),
          p.slug,
          provider,
          csvEscape(imgUrl),
          `${analysis.width}x${analysis.height}`,
          analysis.transparent ? 'sí' : 'no',
          analysis.watermark ? 'sí' : 'no',
          analysis.side < MIN_SIDE || analysis.watermark ? 'descartada' : 'ok',
          matchedModel,
        ].join(',')
      );
      if (analysis.side < MIN_SIDE) {
        discarded.push({ slug: p.slug, reason: `res ${analysis.side}` });
        continue;
      }
      if (analysis.watermark) {
        discarded.push({ slug: p.slug, reason: 'marca de agua' });
        continue;
      }

      if (provider === 'solaire') {
        for (const pdf of (matchedPage.pdfs || []).filter((u) => /FICHA/i.test(u)).slice(0, 1)) {
          const pdfName = `${slugify([p.fm.brand, matchedModel, 'ficha'])}.pdf`;
          try {
            await download(pdf, path.join(FICHAS, pdfName));
            updateMd(p.mdPath, { fichaPdf: `docs/fichas/${pdfName}` });
          } catch {
            /* */
          }
        }
      }

      const composed = await processProviderImage(dest, analysis);
      const seo = slugify([p.fm.brand, matchedModel, p.fm.power]);
      const outs = await writeStudio(seo, composed);
      updateMd(p.mdPath, {
        image: outs.webp,
        imageThumb: outs.thumb,
        imageAlt: `${[p.fm.brand, matchedModel, p.fm.power].filter(Boolean).join(' ')} – Reiki Energía Solar`,
        imageOriginal: `proveedores/${provider}/${path.basename(dest)}`,
        imagen_provisional: false,
        imagenPendiente: false,
      });
      replaced.push({
        slug: p.slug,
        title: p.fm.title,
        provider,
        webp: outs.webp,
        kb: outs.kb,
        url: imgUrl,
      });
      processed++;
      console.log(`  OK ${provider} ${outs.webp}`);
    } catch (err) {
      console.error('  FAIL', err.message);
      discarded.push({ slug: p.slug, reason: err.message });
    }

    // polite delay
    await new Promise((r) => setTimeout(r, 400));
  }

  fs.mkdirSync(path.dirname(CSV), { recursive: true });
  fs.writeFileSync(CSV, csvRows.join('\n') + '\n', 'utf8');

  fs.writeFileSync(
    SIN_MATCH,
    [
      '# Sin coincidencia exacta (proveedores)',
      '',
      `Actualizado: ${new Date().toISOString().slice(0, 10)}`,
      '',
      '| Slug | Título | Marca | Modelo | Motivo |',
      '|---|---|---|---|---|',
      ...noMatch.map(
        (r) =>
          `| ${r.slug || ''} | ${r.title || ''} | ${r.brand || ''} | ${r.model || ''} | ${r.reason} |`
      ),
      '',
    ].join('\n'),
    'utf8'
  );

  const cards = replaced
    .map(
      (r) => `<article class="card"><h3>${r.title}</h3>
      <p class="meta">${r.provider} · ${r.kb} KB</p>
      <figure><img src="../public${r.webp}" alt=""/><figcaption>${r.provider}</figcaption></figure></article>`
    )
    .join('\n');
  fs.writeFileSync(
    CONTACT,
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Proveedores</title>
<style>body{font-family:Segoe UI,sans-serif;background:#f4f5f7;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e4e7eb;border-radius:10px;padding:10px}
img{width:100%;aspect-ratio:1;object-fit:contain;background:#eef0f3}
.meta{font-size:0.75rem;color:#666}</style></head>
<body><h1>Fase C — proveedores</h1><p>${replaced.length} reemplazadas (revisar autorización de uso antes de publicar)</p>
<div class="grid">${cards}</div></body></html>`,
    'utf8'
  );

  const refreshed = loadProducts();
  const metrics = catalogMetrics(refreshed);
  let md = fs.existsSync(METRICS) ? fs.readFileSync(METRICS, 'utf8') : '';
  md += [
    '',
    '## Tras Fase C (proveedores)',
    '',
    `| Estado | SKUs | % |`,
    `|---|---:|---:|`,
    `| Definitiva | ${metrics.definitiva} | ${metrics.pctDef}% |`,
    `| Provisional | ${metrics.provisional} | ${metrics.pctProv}% |`,
    `| Sin imagen | ${metrics.sin} | ${metrics.pctSin}% |`,
    '',
    `- Reemplazadas desde proveedor: **${replaced.length}**`,
    `- Sin coincidencia: **${noMatch.length}**`,
    `- Descartadas (res/agua/error): **${discarded.length}**`,
    `- CSV: \`docs/fuentes-imagenes.csv\``,
    `- Contact sheet: \`docs/contact-sheet-proveedores.html\``,
    '',
    '> No publicar en producción hasta confirmar autorización de uso con cada proveedor.',
    '',
  ].join('\n');
  fs.writeFileSync(METRICS, md, 'utf8');

  console.log('\n=== FASE C ===');
  console.log('Reemplazadas:', replaced.length);
  console.log('Sin coincidencia:', noMatch.length);
  console.log('Descartadas:', discarded.length);
  console.log(
    `Métricas: definitiva ${metrics.pctDef}% | provisional ${metrics.pctProv}% | sin ${metrics.pctSin}%`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
