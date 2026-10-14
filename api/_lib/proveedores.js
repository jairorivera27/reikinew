/**
 * Proveedor de cada equipo de la tienda (data/proveedores-tienda.json).
 * El JSON lo genera scripts/lista-interna-proveedores.py a partir de la Lista Interna.
 * Solo se expone por la API autenticada del admin (/api/orders-search).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIN_DATO = 'Por confirmar';

let cache = null;

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function load() {
  if (cache) return cache;
  const candidates = [
    path.join(process.cwd(), 'data', 'proveedores-tienda.json'),
    path.join(__dirname, '..', '..', 'data', 'proveedores-tienda.json'),
  ];
  let raw = {};
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      }
    } catch {
      /* siguiente */
    }
  }
  const porTitulo = new Map();
  const porCodigo = new Map();
  for (const [slug, v] of Object.entries(raw)) {
    if (v && v.titulo) porTitulo.set(norm(v.titulo), v);
    if (v && v.codigo && !porCodigo.has(norm(v.codigo))) porCodigo.set(norm(v.codigo), v);
    if (!porCodigo.has(norm(slug))) porCodigo.set(norm(slug), v);
  }
  cache = { raw, porTitulo, porCodigo };
  return cache;
}

/** Devuelve { proveedor, codigo } para un ítem de pedido ({ sku, name }). */
export function proveedorDeItem(it) {
  const { raw, porTitulo, porCodigo } = load();
  const sku = String((it && (it.sku || it.id || it.slug)) || '').trim();
  const name = String((it && (it.name || it.title)) || '').trim();
  const hit =
    (sku && raw[sku]) ||
    (sku && porCodigo.get(norm(sku))) ||
    (name && porTitulo.get(norm(name))) ||
    (sku && porTitulo.get(norm(sku))) ||
    null;
  return {
    proveedor: (hit && hit.proveedor) || SIN_DATO,
    codigoProveedor: (hit && hit.codigo) || '',
  };
}

/** Agrega `proveedor` y `codigoProveedor` a cada ítem del pedido. */
export function conProveedores(order) {
  if (!order || !Array.isArray(order.items)) return order;
  return {
    ...order,
    items: order.items.map((it) => (it && typeof it === 'object' ? { ...it, ...proveedorDeItem(it) } : it)),
  };
}
