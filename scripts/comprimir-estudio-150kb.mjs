/**
 * Recomprime WebP estudio > 150 KB (p.ej. Victron BlueSolar).
 * Uso: node scripts/comprimir-estudio-150kb.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'public/images/productos-estudio';
const MAX_KB = 150;

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.webp') && !f.includes('-thumb'));
let fixed = 0;
for (const f of files) {
  const p = path.join(DIR, f);
  const kb = fs.statSync(p).size / 1024;
  if (kb <= MAX_KB) continue;
  console.log(`reencode ${f} ${kb.toFixed(1)} KB…`);
  const img = sharp(p);
  let q = 82;
  let buf;
  while (q >= 70) {
    buf = await img.webp({ quality: q, effort: 6 }).toBuffer();
    if (buf.length / 1024 <= MAX_KB) break;
    q -= 2;
  }
  // Si aún pasa, suavizar ligeramente el fondo (ruido) con blur selectivo no; reencode más agresivo
  if (buf.length / 1024 > MAX_KB) {
    const png = await sharp(p).png().toBuffer();
    buf = await sharp(png)
      .webp({ quality: 72, effort: 6, smartSubsample: true })
      .toBuffer();
  }
  fs.writeFileSync(p + '.tmp.webp', buf);
  fs.renameSync(p + '.tmp.webp', p);
  console.log(`  → ${(buf.length / 1024).toFixed(1)} KB (q~${q})`);
  fixed++;
}
console.log('Reencoded:', fixed);
