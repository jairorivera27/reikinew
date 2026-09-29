/**
 * Restaura home: PWM Victron 30A SCC040030020 con foto BlueSolar PWM Autosolar → estudio.
 * node scripts/restaurar-pwm-victron-30a.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = process.cwd();
const SLUG = 'controlador-de-carga-solar-pwm-victron-30a-scc040030020';
const SRC =
  'imagenes-proveedores/autosolar/victron/scc040030020/01-controlador-carga-bluesolar-pwm-lcdusb-1224v-30a-victron-energy.jpg';
const ORIG_DIR = path.join(ROOT, 'imagenes-originales', 'proveedores', 'autosolar');
const ORIG_NAME = 'controlador-carga-bluesolar-pwm-lcdusb-1224v-30a-victron-energy.jpg';
const SEO = 'victron-bluesolar-pwm-30a';
const OUT = path.join(ROOT, 'public', 'images', 'productos-estudio');
const MD = path.join(ROOT, 'src', 'content', 'productos', `${SLUG}.md`);
const CANVAS = 1600;
const THUMB = 600;
const MAX_UPSCALE = 1.3;
const FIT = 0.8;
const WEBP_Q = 86;

function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { fm: {}, body: raw, rawFm: '' };
  return { rawFm: m[1], body: raw.slice(m[0].length) };
}

function set(text, key, val) {
  if (val === null) {
    return text
      .split(/\r?\n/)
      .filter((l) => !new RegExp(`^${key}:`).test(l))
      .join('\n');
  }
  const line =
    typeof val === 'boolean' ? `${key}: ${val}` : `${key}: "${String(val).replace(/"/g, '\\"')}"`;
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  return re.test(text) ? text.replace(re, line) : `${text}\n${line}`;
}

async function radialBg(size) {
  const buf = Buffer.alloc(size * size * 3);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy) / (size * 0.72);
      const t = Math.min(1, d);
      const v = Math.round(252 - t * 14);
      const i = (y * size + x) * 3;
      buf[i] = v;
      buf[i + 1] = v;
      buf[i + 2] = v + 2;
    }
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

async function softShadow(size, pw, bottomY) {
  const w = Math.round(pw * 0.72);
  const h = Math.round(size * 0.035);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <ellipse cx="${size / 2}" cy="${bottomY + h * 0.2}" rx="${w / 2}" ry="${h}" fill="rgba(15,23,42,0.18)"/>
    </svg>`
  );
  return sharp(svg).png().toBuffer();
}

async function floodCut(abs) {
  const { data, info } = await sharp(abs, { failOn: 'none' }).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.from(data);
  const visited = new Uint8Array(w * h);
  const stack = [];
  const isBg = (i) => {
    const r = out[i],
      g = out[i + 1],
      b = out[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma >= 240 && Math.max(r, g, b) - Math.min(r, g, b) <= 20;
  };
  for (let x = 0; x < w; x++) {
    stack.push(x, (h - 1) * w + x, x);
    stack.push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    stack.push(y * w);
    stack.push(y * w + (w - 1));
  }
  // seed edges
  const q = [];
  for (let x = 0; x < w; x++) {
    q.push(x);
    q.push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    q.push(y * w);
    q.push(y * w + w - 1);
  }
  while (q.length) {
    const p = q.pop();
    if (p < 0 || p >= w * h || visited[p]) continue;
    const i = p * ch;
    if (!isBg(i)) continue;
    visited[p] = 1;
    out[i + 3] = 0;
    q.push(p + 1, p - 1, p + w, p - w);
  }
  return sharp(out, { raw: { width: w, height: h, channels: ch } }).png().toBuffer();
}

async function main() {
  const srcAbs = path.join(ROOT, SRC);
  if (!fs.existsSync(srcAbs)) throw new Error('Falta fuente ' + SRC);
  fs.mkdirSync(ORIG_DIR, { recursive: true });
  const origAbs = path.join(ORIG_DIR, ORIG_NAME);
  fs.copyFileSync(srcAbs, origAbs);

  const meta = await sharp(origAbs, { failOn: 'none' }).metadata();
  console.log('source', meta.width, 'x', meta.height);

  let cutout;
  try {
    // try AI worker if available
    const worker = path.join(ROOT, 'scripts', '_bg-removal-worker.mjs');
    if (fs.existsSync(worker)) {
      const tmpIn = path.join(OUT, `_tmp-${SEO}-in.png`);
      const tmpOut = path.join(OUT, `_tmp-${SEO}-cut.png`);
      await sharp(origAbs).png().toFile(tmpIn);
      const r = spawnSync(process.execPath, [worker, tmpIn, tmpOut], {
        encoding: 'utf8',
        timeout: 120000,
      });
      if (r.status === 0 && fs.existsSync(tmpOut)) {
        cutout = fs.readFileSync(tmpOut);
        console.log('cutout: AI worker');
      }
      try {
        fs.unlinkSync(tmpIn);
        if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
      } catch {
        /* */
      }
    }
  } catch (e) {
    console.warn('AI skip', e.message);
  }
  if (!cutout) {
    cutout = await floodCut(origAbs);
    console.log('cutout: flood white');
  }

  const cutMeta = await sharp(cutout).metadata();
  const maxSide = Math.max(cutMeta.width || 1, cutMeta.height || 1);
  let targetFit = FIT;
  let scale = (CANVAS * targetFit) / maxSide;
  if (scale > MAX_UPSCALE) {
    targetFit = 0.7;
    scale = (CANVAS * targetFit) / maxSide;
  }
  if (scale > MAX_UPSCALE) scale = MAX_UPSCALE;
  const pw = Math.round((cutMeta.width || 1) * scale);
  const ph = Math.round((cutMeta.height || 1) * scale);
  const resized = await sharp(cutout).resize(pw, ph, { fit: 'fill' }).png().toBuffer();
  const bg = await radialBg(CANVAS);
  const left = Math.round((CANVAS - pw) / 2);
  const top = Math.round((CANVAS - ph) / 2 - CANVAS * 0.015);
  const shadow = await softShadow(CANVAS, pw, top + ph);
  const composed = await sharp(bg)
    .composite([
      { input: shadow, top: 0, left: 0 },
      { input: resized, top, left },
    ])
    .png()
    .toBuffer();

  fs.mkdirSync(OUT, { recursive: true });
  const webp = path.join(OUT, `${SEO}.webp`);
  const thumb = path.join(OUT, `${SEO}-thumb.webp`);
  await sharp(composed).webp({ quality: WEBP_Q }).toFile(webp);
  await sharp(composed)
    .resize(THUMB, THUMB, { fit: 'contain', background: { r: 248, g: 250, b: 252, alpha: 1 } })
    .webp({ quality: WEBP_Q })
    .toFile(thumb);

  const raw = fs.readFileSync(MD, 'utf8');
  const { rawFm, body } = parseFm(raw);
  let fm = rawFm;
  fm = set(fm, 'draft', null);
  fm = set(fm, 'imagenPendiente', null);
  fm = set(fm, 'imagen_provisional', false);
  fm = set(fm, 'image', `/images/productos-estudio/${SEO}.webp`);
  fm = set(fm, 'imageThumb', `/images/productos-estudio/${SEO}-thumb.webp`);
  fm = set(fm, 'imageOriginal', `proveedores/autosolar/${ORIG_NAME}`);
  fm = set(fm, 'imageAlt', 'Victron BlueSolar PWM 30A SCC040030020 – Reiki Energía Solar');
  fs.writeFileSync(MD, `---\n${fm}\n---${body}`);
  console.log('OK restaurado', SLUG, webp);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
