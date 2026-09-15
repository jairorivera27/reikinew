/**
 * Reintenta productos que fallaron en el último sync (data/_tmp-merchant-sync-errors.json).
 * Usa offerId ≤ 50 chars (sku o hash del slug).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { insertProductsBatch } from './insert-product.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRODUCTOS_DIR = path.join(ROOT, 'src', 'content', 'productos');
const ERR_IN = path.join(ROOT, 'data', '_tmp-merchant-sync-errors.json');
const ERR_OUT = path.join(ROOT, 'data', '_tmp-merchant-retry-errors.json');

function unquote(v) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parse(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (km && km[1] !== 'specifications' && km[1] !== 'seoKeywords') {
      data[km[1]] = unquote(km[2]);
    }
  }
  return data;
}

function toOfferId(slug, sku) {
  const s = String(sku || '').trim();
  if (s && s.length <= 50 && !/\s/.test(s)) return s;
  if (slug.length <= 50) return slug;
  return `r${createHash('sha1').update(slug).digest('hex').slice(0, 49)}`;
}

function digits(p) {
  return String(p || '').replace(/[^\d]/g, '');
}

const errFile = JSON.parse(fs.readFileSync(ERR_IN, 'utf8'));
const failedSlugs = new Set(errFile.errors.map((e) => e.offerId));

const inputs = [];
for (const file of fs.readdirSync(PRODUCTOS_DIR).filter((f) => f.endsWith('.md'))) {
  const slug = file.replace(/\.md$/i, '');
  if (!failedSlugs.has(slug)) continue;
  const data = parse(fs.readFileSync(path.join(PRODUCTOS_DIR, file), 'utf8'));
  if (!data || data.draft === 'true' || data.draft === true) continue;
  const d = digits(data.price);
  if (!d || !data.image) continue;
  inputs.push({
    offerId: toOfferId(slug, data.sku),
    title: data.title,
    description: data.seoDescription || data.description || data.title,
    link: `/tienda/${slug}`,
    imageLink: data.image,
    price: d,
    brand: data.brand,
    mpn: data.model || data.sku,
    stock: data.stock || 'disponible',
    productType: data.category,
  });
}

console.log('Reintentando', inputs.length, 'productos fallidos…');
const { ok, errors } = await insertProductsBatch(inputs, { concurrency: 4 });
console.log({ ok, err: errors.length });

const by = {};
for (const e of errors) {
  const k = e.message.includes('410')
    ? '410_sunset'
    : e.message.includes('too long')
      ? 'id_too_long'
      : e.message.slice(0, 120);
  by[k] = (by[k] || 0) + 1;
}
console.log(by);
fs.writeFileSync(ERR_OUT, JSON.stringify({ ok, errors, by }, null, 2));
console.log('Reporte:', ERR_OUT);
