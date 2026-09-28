/**
 * IVA compartido (carrito web + PDF + bot + Wompi/Addi).
 *
 * Dos grupos (config/empresa.json → iva):
 * - precio_final (paneles, inversores/microinversores, reflectores, bombeo):
 *   el precio publicado ES el total; sin IVA visible ni etiqueta.
 * - resto: IVA = redondeo(precio × tasa) por ítem; total ítem = precio + IVA;
 *   etiqueta "+ IVA".
 *
 * Total cotización = suma de precios publicados + IVA de gravados (+ envío).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_IVA_TASA = 0.19;
export const DEFAULT_PRECIO_FINAL = ['paneles', 'inversores', 'reflectores', 'bombeo'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {{ precioFinal: string[], tasa: number } | null} */
let ivaCfgCache = null;

export function loadIvaConfig() {
  if (ivaCfgCache) return ivaCfgCache;
  const candidates = [
    path.join(process.cwd(), 'config', 'empresa.json'),
    path.join(__dirname, '..', '..', 'config', 'empresa.json'),
  ];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      const iva = j.iva && typeof j.iva === 'object' ? j.iva : null;
      // Compat: iva_excluidas antiguas → precio_final
      const list = Array.isArray(iva?.precio_final)
        ? iva.precio_final
        : Array.isArray(j.iva_excluidas)
          ? j.iva_excluidas
          : DEFAULT_PRECIO_FINAL;
      const tasa = Number(iva?.tasa) > 0 ? Number(iva.tasa) : DEFAULT_IVA_TASA;
      ivaCfgCache = {
        precioFinal: list.map((x) => String(x).toLowerCase().trim()).filter(Boolean),
        tasa,
      };
      return ivaCfgCache;
    } catch {
      /* next */
    }
  }
  ivaCfgCache = { precioFinal: [...DEFAULT_PRECIO_FINAL], tasa: DEFAULT_IVA_TASA };
  return ivaCfgCache;
}

/** Invalida caché (tests). */
export function resetIvaCache() {
  ivaCfgCache = null;
}

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * ¿Precio final (sin IVA adicional)?
 * @param {{ precioFinal?: boolean, excluidoIva?: boolean, categoria?: string, category?: string, nombre?: string, title?: string }} item
 * @param {string[]} [precioFinalCats]
 */
export function isPrecioFinal(item, precioFinalCats) {
  if (item && (item.precioFinal === true || item.excluidoIva === true)) return true;
  if (item && (item.precioFinal === false || item.excluidoIva === false)) return false;

  const cats = (precioFinalCats || loadIvaConfig().precioFinal).map(norm);
  const cat = norm(item?.categoria || item?.category || '');
  const name = norm(item?.nombre || item?.title || '');

  for (const pf of cats) {
    if (!pf) continue;
    if (cat === pf || cat.includes(pf) || (cat && pf.includes(cat))) return true;
  }

  // Respaldo por nombre cuando falta categoría
  if (/\bmicroinversor|microinverter|micro-inversor\b/.test(name)) return true;
  if (/\binversor(es)?\b/.test(name)) return true;
  if (/\bpanel(es)?\b/.test(name) && !/\b(protector|proteccion|estructura|cable|conector|cargador)\b/.test(name)) {
    return true;
  }
  if (/\b(reflector|luminaria|lampara|lámpara)\b/.test(name)) return true;
  if (/\b(bomba|bombeo)\b/.test(name)) return true;
  return false;
}

/** @deprecated alias — preferir isPrecioFinal */
export function isExcluidoIva(item, list) {
  return isPrecioFinal(item, list);
}

/**
 * Totales: Subtotal = suma precios publicados; IVA = suma (precio×tasa) en gravados.
 * @param {Array<object>} items
 * @param {{ envio?: number|null, ivaConfig?: { precioFinal: string[], tasa: number } }} [opts]
 */
export function calcTotalesIva(items, opts = {}) {
  const cfg = opts.ivaConfig || loadIvaConfig();
  const tasa = cfg.tasa || DEFAULT_IVA_TASA;
  let subtotal = 0;
  let iva = 0;
  let subtotalPrecioFinal = 0;
  let subtotalGravado = 0;

  for (const it of items || []) {
    const qty = Number(it.quantity ?? it.qty ?? it.cantidad ?? 1) || 1;
    const unit = Math.round(Number(it.price ?? it.precioNum ?? it.precio_unit ?? 0) || 0);
    const line = unit * qty;
    subtotal += line;
    if (isPrecioFinal(it, cfg.precioFinal)) {
      subtotalPrecioFinal += line;
    } else {
      subtotalGravado += line;
      // IVA por ítem (línea): redondeo a pesos
      iva += Math.round(line * tasa);
    }
  }

  const envio = opts.envio == null ? null : Math.round(Number(opts.envio) || 0);
  const envioVal = envio == null ? 0 : envio;
  const total = subtotal + iva + envioVal;

  return {
    subtotal: Math.round(subtotal),
    subtotalPrecioFinal: Math.round(subtotalPrecioFinal),
    subtotalGravado: Math.round(subtotalGravado),
    iva: Math.round(iva),
    envio,
    total: Math.round(total),
    tasa,
    mostrarIva: Math.round(iva) > 0,
    // Compat nombres antiguos
    excluido: Math.round(subtotalPrecioFinal),
    baseGravada: Math.round(subtotalGravado),
    gravadoConIva: Math.round(subtotalGravado),
    subtotalConIva: Math.round(subtotal),
  };
}

/** @deprecated Preferir calcTotalesIva */
export function calcTotalesConIvaIncluido(items, opts = {}) {
  return calcTotalesIva(items, {
    ...opts,
    ivaConfig: opts.ivaExcluidas
      ? { precioFinal: opts.ivaExcluidas, tasa: loadIvaConfig().tasa }
      : opts.ivaConfig,
  });
}

export function formatCopPdf(v) {
  const n = Math.round(Number(v) || 0);
  return '$ ' + n.toLocaleString('es-CO').replace(/\s/g, '.');
}

export function formatCopCart(v) {
  const n = Math.round(Number(v) || 0);
  return '$' + n.toLocaleString('es-CO');
}

export const IVA_NOTA =
  'Paneles, inversores, reflectores y bombeo solar: precio final. Los demás productos: se adiciona IVA del 19 %.';
