/**
 * Catálogos de precios de los proveedores (varias fuentes por producto).
 * Cada proveedor guarda su lista { nombre, sku, marca, costo, stock, url } en Redis (no en el repositorio:
 * es público y no deben verse costos ni proveedores). `alternativas()` cruza un equipo con todas las listas
 * por la referencia del fabricante (SDM630, SL7N-63, RCC-02…) para ver quién más lo tiene y a qué precio.
 */
import { getRedis, waKey } from './whatsapp-redis.js';

const IDX = waKey('proveedores', 'catalogos');
const keyDe = (p) => waKey('proveedores', 'catalogo:' + norm(p));
const mem = (globalThis.__reikiCatalogos = globalThis.__reikiCatalogos || {});

export const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

const SPEC = /^\d+(\.\d+)?(w|kw|wp|v|vac|vdc|voc|mm2|mm|a|ah|kwh|kva|hz|p|polos?|m|mts|kv|ka|x\d+)$/;

/** Referencias de modelo dentro de un texto (con letras y números, sin ser una medida como 110VAC o 550W). */
export function referencias(...textos) {
  const out = new Set();
  for (const s of textos)
    for (const w of String(s || '').split(/[\s,/()+|]+/)) {
      const t = norm(w);
      if (t.length >= 5 && /\d/.test(t) && /[a-z]/.test(t) && !SPEC.test(t) && !/^(dc|ac)\d+v?$/.test(t)) out.add(t);
    }
  return out;
}

async function leerIndice() {
  const r = getRedis();
  if (r) {
    try {
      const v = await r.get(IDX);
      if (v) return typeof v === 'string' ? JSON.parse(v) : v;
    } catch {}
  }
  return mem.__indice || {};
}

/** Resumen: { Proveedor: { fecha, productos, fuente } } */
export async function catalogosResumen() {
  return leerIndice();
}

export async function leerCatalogo(proveedor) {
  const k = keyDe(proveedor);
  const r = getRedis();
  if (r) {
    try {
      const v = await r.get(k);
      if (v) return typeof v === 'string' ? JSON.parse(v) : v;
    } catch {}
  }
  return mem[k] || null;
}

/** Reemplaza la lista de precios de un proveedor. productos: [{ nombre, sku, marca, costo, stock, url }] */
export async function guardarCatalogo(proveedor, productos = [], fuente = '') {
  const p = String(proveedor || '').trim().slice(0, 80);
  if (!p) throw new Error('Falta el proveedor.');
  const lista = (Array.isArray(productos) ? productos : [])
    .slice(0, 5000)
    .map((x) => ({
      nombre: String(x.nombre || '').slice(0, 200),
      sku: String(x.sku || '').slice(0, 80),
      marca: String(x.marca || '').slice(0, 60),
      costo: Math.round(Number(String(x.costo ?? '').replace(/[^\d.]/g, '')) || 0),
      stock: x.stock === false || x.stock === 'agotado' ? false : x.stock == null ? null : true,
      url: String(x.url || '').slice(0, 300),
    }))
    .filter((x) => x.nombre);
  const doc = { proveedor: p, fecha: new Date().toISOString(), fuente: String(fuente || '').slice(0, 200), productos: lista };
  const indice = await leerIndice();
  indice[p] = { fecha: doc.fecha, productos: lista.length, fuente: doc.fuente };
  mem[keyDe(p)] = doc;
  mem.__indice = indice;
  const r = getRedis();
  if (r) {
    await r.set(keyDe(p), doc);
    await r.set(IDX, indice);
  }
  return indice;
}

/**
 * Proveedores que tienen un equipo (según sus listas), del más conveniente al menos:
 * primero con stock, luego por costo. `excluir`: proveedores a omitir (el actual o los que dijeron agotado).
 */
export async function alternativas({ nombre, sku, codigo } = {}, excluir = []) {
  const refs = referencias(nombre, sku, codigo);
  if (!refs.size) return [];
  const fuera = new Set((excluir || []).map(norm));
  const indice = await leerIndice();
  const out = [];
  for (const prov of Object.keys(indice)) {
    if (fuera.has(norm(prov))) continue;
    const cat = await leerCatalogo(prov);
    for (const x of (cat && cat.productos) || []) {
      const rs = referencias(x.nombre, x.sku);
      const comun = [...refs].filter((t) => rs.has(t));
      if (comun.length) out.push({ proveedor: prov, ...x, coincide: comun.join(', '), fecha: cat.fecha });
    }
  }
  return out.sort((a, b) => (b.stock === true) - (a.stock === true) || (a.costo || 9e15) - (b.costo || 9e15)).slice(0, 12);
}
