/**
 * Fase A: miniaturas provisionales 600×600 estilo estudio
 * Solo fuentes descartadas por resolución (<1000px).
 * Excluye pedestal / marketing / placeholder.
 *
 * Uso: node scripts/fase-a-provisionales.mjs
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
const MANIFEST_IN = path.join(ROOT, 'docs', 'procesar-imagenes-manifest.json');
const METRICS = path.join(ROOT, 'docs', 'metricas-imagenes.md');
const CONTACT = path.join(ROOT, 'docs', 'contact-sheet-provisionales.html');

const CANVAS = 600;
const FIT_TARGET = 0.8;
const FIT_MIN = 0.65;
const MAX_UPSCALE = 1.3;
const WEBP_Q = 86;
const WHITE_EDGE = 245;

/** Fuentes que NO entran aunque sean solo "baja res" (pedestal / marketing / escena). */
const DENY = [
  /inti-mppt/i,
  /hoymiles-hms/i, // gráfico Solux
  /placeholders\//i,
  /\/marcas\//i,
  /livoltek\.png$/i,
  /logo-victron/i,
];

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
  const line =
    typeof value === 'boolean'
      ? `${key}: ${value}`
      : `${key}: "${String(value).replace(/"/g, '\\"')}"`;
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  if (re.test(fmText)) return fmText.replace(re, line);
  return `${fmText}\n${line}`;
}

function publicToAbs(pub) {
  return path.join(ROOT, 'public', String(pub).replace(/^\//, '').replace(/\//g, path.sep));
}

function resolveAbs(pub) {
  const abs = publicToAbs(pub);
  if (fs.existsSync(abs)) return abs;
  const bak = path.join(ORIG_ROOT, String(pub).replace(/^\//, '').replace(/\//g, path.sep));
  return fs.existsSync(bak) ? bak : null;
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

async function radialBg(size) {
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
  return sharp(buf, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

async function softShadow(size, productW, bottomY) {
  const ew = Math.round(productW * 0.7);
  const eh = Math.max(14, Math.round(productW * 0.05));
  const cy = Math.min(size - 4, bottomY + Math.round(eh * 0.15));
  const svg = Buffer.from(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <ellipse cx="${size / 2}" cy="${cy}" rx="${ew / 2}" ry="${eh / 2}" fill="rgba(18,22,30,0.22)"/></svg>`);
  return sharp(svg).blur(12).png().toBuffer();
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
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
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
  const tmp = path.join(ROOT, 'docs', 'piloto-preview', `_a-cut-${Date.now()}.png`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  const worker = path.join(__dirname, '_bg-removal-worker.mjs');
  const r = spawnSync(process.execPath, [worker, abs, tmp], {
    encoding: 'utf8',
    timeout: 120_000,
    windowsHide: true,
  });
  if (r.status !== 0 || !fs.existsSync(tmp)) throw new Error('ai fail');
  const buf = fs.readFileSync(tmp);
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* */
  }
  return buf;
}

async function toCutout(abs, meta, edge) {
  if (meta.hasAlpha && edge.opaqueRatio < 0.92) {
    return sharp(abs, { failOn: 'none' }).ensureAlpha().png().toBuffer();
  }
  if (edge.meanEdge >= WHITE_EDGE) return floodWhite(abs);
  try {
    return await aiCutout(abs);
  } catch {
    return floodWhite(abs);
  }
}

async function compose(cutout) {
  const trimmed = await sharp(cutout)
    .trim({ threshold: 10 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const tw = trimmed.info.width;
  const th = trimmed.info.height;
  const maxSide = Math.max(tw, th);
  let fit = FIT_TARGET;
  let scale = (CANVAS * fit) / maxSide;
  if (scale > MAX_UPSCALE) {
    fit = FIT_MIN;
    scale = (CANVAS * fit) / maxSide;
  }
  if (scale > MAX_UPSCALE) scale = MAX_UPSCALE;

  const pw = Math.max(1, Math.round(tw * scale));
  const ph = Math.max(1, Math.round(th * scale));
  const product = await sharp(trimmed.data)
    .resize(pw, ph, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .modulate({ brightness: 1.02 })
    .linear(1.06, -(128 * 0.06))
    .sharpen({ sigma: 0.55, m1: 0.45, m2: 0.25 })
    .ensureAlpha()
    .png()
    .toBuffer();

  const bg = await radialBg(CANVAS);
  const left = Math.round((CANVAS - pw) / 2);
  const top = Math.round((CANVAS - ph) / 2 - CANVAS * 0.015);
  const shadow = await softShadow(CANVAS, pw, top + ph);
  const composed = await sharp(bg)
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: product, left, top },
    ])
    .png()
    .toBuffer();
  return { composed, scale, fit };
}

function backup(abs, pub) {
  const dest = path.join(ORIG_ROOT, String(pub).replace(/^\//, '').replace(/\//g, path.sep));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest)) fs.copyFileSync(abs, dest);
}

function updateMd(mdPath, fields) {
  const raw = fs.readFileSync(mdPath, 'utf8');
  const { body, rawFm } = parseFm(raw);
  let fm = rawFm;
  for (const [k, v] of Object.entries(fields)) fm = setFmLine(fm, k, v);
  fs.writeFileSync(mdPath, `---\n${fm}\n---${body}`, 'utf8');
}

function loadProductsBySlug() {
  const map = new Map();
  for (const f of fs.readdirSync(PROD_DIR).filter((x) => x.endsWith('.md'))) {
    const slug = f.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(PROD_DIR, f), 'utf8');
    const { fm } = parseFm(raw);
    map.set(slug, { slug, mdPath: path.join(PROD_DIR, f), fm });
  }
  return map;
}

function catalogMetrics(products) {
  let definitiva = 0;
  let provisional = 0;
  let sin = 0;
  for (const p of products.values()) {
    if (String(p.fm.draft) === 'true') continue;
    const img = p.fm.image || '';
    const prov =
      String(p.fm.imagen_provisional) === 'true' || p.fm.imagen_provisional === true;
    const pending = String(p.fm.imagenPendiente) === 'true';
    const placeholder = /placeholders\//i.test(img) || pending;
    if (placeholder || !img) sin++;
    else if (prov) provisional++;
    else if (/productos-estudio\//i.test(img)) definitiva++;
    else provisional++; // foto cruda sin pipeline = tratar como no definitiva
  }
  const total = definitiva + provisional + sin;
  return {
    total,
    definitiva,
    provisional,
    sin,
    pctDef: total ? ((definitiva / total) * 100).toFixed(1) : '0',
    pctProv: total ? ((provisional / total) * 100).toFixed(1) : '0',
    pctSin: total ? ((sin / total) * 100).toFixed(1) : '0',
  };
}

async function main() {
  const man = JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf8'));
  const bySlug = loadProductsBySlug();

  // Fuentes solo por resolución
  const groups = new Map();
  for (const r of man.rejected || []) {
    if (!/Resolución/i.test(r.reason || '')) continue;
    if (DENY.some((re) => re.test(r.pub || ''))) continue;
    if (!groups.has(r.pub)) groups.set(r.pub, []);
    for (const slug of r.skus || []) {
      const p = bySlug.get(slug);
      if (p) groups.get(r.pub).push(p);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const done = [];
  const skipped = [];
  let i = 0;
  for (const [pub, products] of groups) {
    i++;
    const abs = resolveAbs(pub);
    if (!abs || !products.length) {
      skipped.push({ pub, reason: 'sin archivo o SKUs' });
      continue;
    }
    const meta = await sharp(abs, { failOn: 'none' }).metadata();
    const edge = await meanEdge(abs);
    const seo =
      products.length === 1
        ? slugify([products[0].fm.brand, products[0].fm.model || products[0].fm.sku, products[0].fm.power, 'prov'])
        : slugify([path.basename(pub, path.extname(pub)), 'prov']);

    console.log(`[${i}/${groups.size}] ${seo} ← ${pub}`);
    backup(abs, pub);
    try {
      const cut = await toCutout(abs, meta, edge);
      const { composed, scale, fit } = await compose(cut);
      const outWebp = path.join(OUT_DIR, `${seo}.webp`);
      await sharp(composed).webp({ quality: WEBP_Q, effort: 5 }).toFile(outWebp);
      const webp = `/images/productos-estudio/${seo}.webp`;
      const kb = Math.round((fs.statSync(outWebp).size / 1024) * 10) / 10;

      for (const p of products) {
        const alt = [p.fm.brand, p.fm.model || p.fm.sku, p.fm.power]
          .filter(Boolean)
          .join(' ');
        updateMd(p.mdPath, {
          image: webp,
          imageThumb: webp,
          imageAlt: `${alt || p.fm.title} – Reiki Energía Solar`,
          imageOriginal: pub,
          imagen_provisional: true,
        });
      }
      done.push({
        pub,
        webp,
        kb,
        scale,
        fit,
        skus: products.map((p) => p.slug),
        title: products[0].fm.title,
        category: products[0].fm.category,
      });
    } catch (err) {
      console.error('  FAIL', err.message);
      skipped.push({ pub, reason: err.message });
    }
  }

  // Reload for metrics
  const after = loadProductsBySlug();
  const metrics = catalogMetrics(after);

  // Contact sheet provisionales
  const cards = done
    .map(
      (r) => `<article class="card"><h3>${r.title || ''}</h3>
      <p class="meta">${r.category} · ${r.kb} KB · fit ${(r.fit * 100).toFixed(0)}% · scale ${r.scale.toFixed(2)} · PROVISIONAL</p>
      <div class="pair">
        <figure><img src="../public${r.pub}" alt="antes"/><figcaption>Antes</figcaption></figure>
        <figure><img src="../public${r.webp}" alt="prov"/><figcaption>Provisional 600</figcaption></figure>
      </div></article>`
    )
    .join('\n');
  fs.writeFileSync(
    CONTACT,
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Provisionales Fase A</title>
<style>body{font-family:Segoe UI,system-ui,sans-serif;background:#f4f5f7;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:14px}
.card{background:#fff;border:1px solid #e4e7eb;border-radius:10px;padding:12px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
img{width:100%;aspect-ratio:1;object-fit:contain;background:#eef0f3}
.meta{font-size:0.75rem;color:#6b7280}</style></head>
<body><h1>Fase A — provisionales</h1>
<p>${done.length} fuentes · métricas: definitiva ${metrics.pctDef}% · provisional ${metrics.pctProv}% · sin ${metrics.pctSin}%</p>
<div class="grid">${cards}</div></body></html>`,
    'utf8'
  );

  const md = [
    '# Métricas de imágenes de producto',
    '',
    `Actualizado: ${new Date().toISOString()}`,
    '',
    '## Tras Fase A (provisionales)',
    '',
    `| Estado | SKUs | % |`,
    `|---|---:|---:|`,
    `| Foto definitiva (estudio ≥1000px) | ${metrics.definitiva} | ${metrics.pctDef}% |`,
    `| Provisional (estudio 600, ` + '`imagen_provisional`' + `) | ${metrics.provisional} | ${metrics.pctProv}% |`,
    `| Sin imagen usable (placeholder/logo) | ${metrics.sin} | ${metrics.pctSin}% |`,
    `| **Total activos** | ${metrics.total} | 100% |`,
    '',
    `Fuentes provisionales generadas: **${done.length}**`,
    `Fuentes denegadas/fallidas en Fase A: **${skipped.length}** (pedestal/marketing/error)`,
    '',
    'Contact sheet: `docs/contact-sheet-provisionales.html`',
    '',
  ];
  fs.writeFileSync(METRICS, md.join('\n'), 'utf8');
  fs.writeFileSync(
    path.join(ROOT, 'docs', 'fase-a-manifest.json'),
    JSON.stringify({ at: new Date().toISOString(), done, skipped, metrics }, null, 2)
  );

  console.log('\n=== FASE A ===');
  console.log('Provisionales:', done.length, 'fuentes · SKUs', done.reduce((n, d) => n + d.skus.length, 0));
  console.log(`Catálogo: definitiva ${metrics.pctDef}% | provisional ${metrics.pctProv}% | sin ${metrics.pctSin}%`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
