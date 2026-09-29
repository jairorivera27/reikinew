/**
 * Lote seed proveedores: Hoymiles HMS/HMT Solaire + Victron MPPT Autosolar (match exacto).
 * Uso: node scripts/_fase-c-seeds.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/images/productos-estudio');
const ORIG = path.join(ROOT, 'imagenes-originales/proveedores');
const FICHAS = path.join(ROOT, 'docs/fichas');
const CSV = path.join(ROOT, 'docs/fuentes-imagenes.csv');
const CANVAS = 1600;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const SEEDS = [
  {
    slug: 'cat-mayorista-595127324da8',
    provider: 'solaire',
    model: 'HMS-800-2T',
    page: 'https://portal.solaire.com.co/producto/hoymiles-microinverter-hms-800-2t/',
    img: 'https://portal.solaire.com.co/wp-content/uploads/2025/12/NFMI0009.png',
    pdf: 'https://portal.solaire.com.co/wp-content/uploads/productos-pdf/ITEMS%20DE%20SAP%20PARA%20GLOBAL%20PAGINA/NFMI0009_FICHA.pdf',
    seo: 'hoymiles-hms-800-2t',
  },
  {
    slug: 'cat-mayorista-dbd01c55a288',
    provider: 'solaire',
    model: 'HMS-2000-4T',
    page: 'https://portal.solaire.com.co/producto/hoymiles-microinverter-hms-2000-4t/',
    img: null, // resolve from page
    pdf: null,
    seo: 'hoymiles-hms-2000-4t',
  },
  {
    slug: null, // resolve by model match SCC110020170 / 100/50 - find in catalog
    provider: 'autosolar',
    model: 'SmartSolar MPPT 100/50',
    matchSkuHint: '100/50',
    page: 'https://autosolar.co/controladores-de-carga-mppt/controlador-carga-smartsolar-mppt-10050-victron-energy',
    img: 'https://cdn.autosolar.co/images/2008191/controlador-carga-smartsolar-mppt-10050-victron-energy.jpg',
    pdf: null,
    seo: 'victron-smartsolar-mppt-100-50',
  },
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

function set(text, key, val) {
  const line = typeof val === 'boolean' ? `${key}: ${val}` : `${key}: "${val}"`;
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  return re.test(text) ? text.replace(re, line) : `${text}\n${line}`;
}

async function download(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(dest, buf);
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

async function studioFromFile(abs) {
  const meta = await sharp(abs).metadata();
  const side = Math.max(meta.width || 0, meta.height || 0);
  if (side < 1000) throw new Error(`baja res ${side}`);
  let cutout;
  if (meta.hasAlpha) {
    cutout = await sharp(abs).ensureAlpha().png().toBuffer();
  } else {
    // flood white
    const { data, info } = await sharp(abs).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: ch } = info;
    const out = Buffer.from(data);
    const visited = new Uint8Array(w * h);
    const stack = [];
    const isBg = (i) => {
      const r = out[i],
        g = out[i + 1],
        b = out[i + 2];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b >= 242;
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
      const y = stack.pop(),
        x = stack.pop();
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
    cutout = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  }

  const trimmed = await sharp(cutout)
    .trim({ threshold: 8 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const tw = trimmed.info.width,
    th = trimmed.info.height;
  let scale = (CANVAS * 0.8) / Math.max(tw, th);
  if (scale > 1.3) scale = (CANVAS * 0.7) / Math.max(tw, th);
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
  return { composed, meta, side };
}

async function resolveImgFromPage(pageUrl) {
  const r = await fetch(pageUrl, { headers: { 'User-Agent': UA } });
  const html = await r.text();
  const urls = [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:png|jpe?g|webp)/gi)].map((m) =>
    m[0].replace(/&amp;/g, '&').replace(/-\d+x\d+(?=\.)/i, '')
  );
  const uniq = [...new Set(urls)].filter(
    (u) => /\/uploads\/|cdn\.autosolar/i.test(u) && !/logo|cropped-Logos|icon/i.test(u)
  );
  uniq.sort((a, b) => (/NF[A-Z]{2}\d+/i.test(b) ? 1 : 0) - (/NF[A-Z]{2}\d+/i.test(a) ? 1 : 0));
  return uniq[0] || null;
}

function findSlugByHint(hint) {
  const dir = path.join(ROOT, 'src/content/productos');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    if (new RegExp(hint.replace('/', '\\/'), 'i').test(raw) && /controlador|victron|smartsolar/i.test(raw)) {
      return f.replace(/\.md$/, '');
    }
  }
  return null;
}

const results = [];
for (const seed of SEEDS) {
  let slug = seed.slug;
  if (!slug && seed.matchSkuHint) slug = findSlugByHint(seed.matchSkuHint);
  if (!slug) {
    console.warn('skip no slug', seed.model);
    continue;
  }
  const mdPath = path.join(ROOT, 'src/content/productos', `${slug}.md`);
  if (!fs.existsSync(mdPath)) {
    console.warn('missing md', slug);
    continue;
  }
  const { fm, body, rawFm } = parseFm(fs.readFileSync(mdPath, 'utf8'));
  // Exact model check against title
  const hay = `${fm.title} ${fm.model || ''} ${fm.sku || ''}`.toUpperCase();
  const need = seed.model.toUpperCase().replace(/\s+/g, '');
  if (!hay.replace(/\s+/g, '').includes(need.replace(/\s+/g, '')) && seed.provider === 'solaire') {
    // allow if title has HMS-800-2T style
    if (!new RegExp(seed.model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(fm.title)) {
      console.warn('sin coincidencia exacta', slug, seed.model);
      continue;
    }
  }

  console.log('→', slug, seed.model);
  let imgUrl = seed.img;
  if (!imgUrl) imgUrl = await resolveImgFromPage(seed.page);
  if (!imgUrl) {
    console.warn('  sin imagen');
    continue;
  }
  // Autosolar: strip -thumb
  imgUrl = imgUrl.replace(/-thumb(?=\.(jpg|jpeg|png|webp))/i, '');

  const dest = path.join(ORIG, seed.provider, path.basename(imgUrl.split('?')[0]));
  await download(imgUrl, dest);
  const { composed, meta, side } = await studioFromFile(dest);
  fs.mkdirSync(OUT, { recursive: true });
  let q = 86;
  let buf = await sharp(composed).webp({ quality: q, effort: 5 }).toBuffer();
  while (buf.length / 1024 > 150 && q > 72) {
    q -= 2;
    buf = await sharp(composed).webp({ quality: q, effort: 6 }).toBuffer();
  }
  fs.writeFileSync(path.join(OUT, `${seed.seo}.webp`), buf);
  await sharp(composed)
    .resize(600, 600, { fit: 'fill' })
    .webp({ quality: 84 })
    .toFile(path.join(OUT, `${seed.seo}-thumb.webp`));

  if (seed.pdf) {
    try {
      await download(seed.pdf, path.join(FICHAS, `${seed.seo}-ficha.pdf`));
    } catch (e) {
      console.warn('  pdf', e.message);
    }
  }

  let f = rawFm;
  f = set(f, 'image', `/images/productos-estudio/${seed.seo}.webp`);
  f = set(f, 'imageThumb', `/images/productos-estudio/${seed.seo}-thumb.webp`);
  f = set(
    f,
    'imageAlt',
    `${fm.brand || ''} ${seed.model} – Reiki Energía Solar`.trim()
  );
  f = set(f, 'imageOriginal', `proveedores/${seed.provider}/${path.basename(dest)}`);
  f = set(f, 'imagen_provisional', false);
  f = set(f, 'imagenPendiente', false);
  if (seed.pdf) f = set(f, 'fichaPdf', `docs/fichas/${seed.seo}-ficha.pdf`);
  if (!fm.model || fm.model.length < seed.model.length) f = set(f, 'model', seed.model);
  fs.writeFileSync(mdPath, `---\n${f}\n---${body}`);

  const row = `"${(fm.title || '').replace(/"/g, '""')}",${slug},${seed.provider},${imgUrl},${meta.width}x${meta.height},${meta.hasAlpha ? 'sí' : 'no'},no,ok,${seed.model}\n`;
  if (!fs.existsSync(CSV)) {
    fs.writeFileSync(
      CSV,
      'producto,slug,proveedor,url,resolucion,transparente,marca_agua,estado,match_modelo\n' + row
    );
  } else if (!fs.readFileSync(CSV, 'utf8').includes(slug)) {
    fs.appendFileSync(CSV, row);
  }

  await sharp(composed)
    .resize(640, 640)
    .png()
    .toFile(path.join(ROOT, 'docs/piloto-preview', `${seed.seo}.png`));
  results.push({ slug, seo: seed.seo, kb: +(buf.length / 1024).toFixed(1), provider: seed.provider, side });
  console.log('  OK', seed.seo, results.at(-1).kb, 'KB');
}

// contact sheet proveedores
const cards = results
  .concat([{ slug: 'cat-mayorista-d99eecbc0d48', seo: 'hoymiles-hmt-2000-4t-208', provider: 'solaire', kb: 19.2 }])
  .map(
    (r) =>
      `<article class="card"><h3>${r.seo}</h3><p class="meta">${r.provider} · ${r.kb} KB</p><img src="piloto-preview/${r.seo}.png" alt=""/></article>`
  )
  .join('\n');
fs.writeFileSync(
  path.join(ROOT, 'docs/contact-sheet-proveedores.html'),
  `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Proveedores</title>
<style>body{font-family:Segoe UI,sans-serif;background:#f4f5f7;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e4e7eb;border-radius:10px;padding:10px}
img{width:100%;aspect-ratio:1;object-fit:contain;background:#eef0f3}
.meta{font-size:.75rem;color:#666}</style></head>
<body><h1>Fase C — seeds proveedores</h1>
<p>Revisar autorización de uso antes de publicar. ${results.length + 1} fotos.</p>
<div class="grid">${cards}</div></body></html>`
);

console.log('\nSeeds OK:', results.length);
