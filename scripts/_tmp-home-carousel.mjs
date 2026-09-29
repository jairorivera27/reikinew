import fs from 'fs';
import path from 'path';
import { calcularValor } from '../src/utils/calidadPrecio.ts';
import { estaRebajado } from '../src/utils/descuentos.ts';

const dir = 'src/content/productos';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const o = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (/^-?\d+(\.\d+)?$/.test(v)) o[k] = Number(v);
    else if (v === 'true') o[k] = true;
    else if (v === 'false') o[k] = false;
    else o[k] = v;
  }
  return o;
}

const productos = [];
for (const f of files) {
  const data = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (data.draft === true) continue;
  const slug = f.replace(/\.md$/, '');
  productos.push({ slug, ...data });
}

const promos = productos
  .filter((p) => estaRebajado(p))
  .sort((a, b) => (b.descuentoPct ?? 0) - (a.descuentoPct ?? 0));

console.log('=== PROMOS', promos.length);
for (const p of promos) {
  console.log(
    `${p.descuentoPct}% | ${p.slug} | ${p.title} | ${p.category} | ${p.price} (antes ${p.precioAnterior}) | order=${p.homeCarouselOrder ?? '-'}`
  );
}

const destacados = [];
for (const cat of new Set(productos.map((p) => p.category))) {
  const vals = calcularValor(productos.filter((p) => p.category === cat));
  for (const [slug, v] of vals) {
    if (v.destacado) {
      const p = productos.find((x) => x.slug === slug);
      destacados.push({
        slug,
        title: p?.title,
        category: cat,
        puntaje: v.puntaje,
        precioPorUnidad: v.precioPorUnidad,
        promo: estaRebajado(p ?? {}),
      });
    }
  }
}
destacados.sort((a, b) => b.puntaje - a.puntaje);
console.log('\n=== MEJOR CALIDAD-PRECIO (destacado=true)', destacados.length);
for (const p of destacados) {
  console.log(
    `${p.puntaje.toFixed(1)} | ${p.slug} | ${p.title} | ${p.category} | promo=${p.promo}`
  );
}

// Proposed mix: up to 4 promos + up to 4 calidad-precio (no dups), total 8
const MAX = 8;
const HALF = 4;
const picked = [];
const ids = new Set();
for (const p of promos) {
  if (picked.length >= HALF) break;
  picked.push({ reason: 'promo', slug: p.slug, title: p.title, pct: p.descuentoPct });
  ids.add(p.slug);
}
for (const p of destacados) {
  if (picked.length >= MAX) break;
  if (ids.has(p.slug)) continue;
  picked.push({ reason: 'calidad', slug: p.slug, title: p.title, puntaje: p.puntaje });
  ids.add(p.slug);
}
// fill remaining with top calidad by score if needed
if (picked.length < MAX) {
  const allScores = [];
  for (const cat of new Set(productos.map((p) => p.category))) {
    const vals = calcularValor(productos.filter((p) => p.category === cat));
    for (const [slug, v] of vals) allScores.push({ slug, puntaje: v.puntaje, title: productos.find((x) => x.slug === slug)?.title });
  }
  allScores.sort((a, b) => b.puntaje - a.puntaje);
  for (const p of allScores) {
    if (picked.length >= MAX) break;
    if (ids.has(p.slug)) continue;
    picked.push({ reason: 'fill', slug: p.slug, title: p.title, puntaje: p.puntaje });
    ids.add(p.slug);
  }
}
console.log('\n=== PROPUESTA CARRUSEL');
picked.forEach((p, i) => console.log(i + 1, p.reason, p.slug, p.title, p.pct ?? p.puntaje));
