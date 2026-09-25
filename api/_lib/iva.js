/**
 * IVA compartido carrito web + cotización PDF + bot + Wompi.
 *
 * Regla Reiki (Ley 1715): paneles e inversores EXCLUIDOS de IVA.
 * Todo lo demás: precio publicado CON IVA 19 % incluido.
 * Categorías excluidas configurables en config/empresa.json → iva_excluidas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const IVA_RATE = 0.19;
export const DEFAULT_IVA_EXCLUIDAS = ['paneles', 'inversores'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let excluidasCache = null;

export function loadIvaExcluidas() {
  if (excluidasCache) return excluidasCache;
  const candidates = [
    path.join(process.cwd(), 'config', 'empresa.json'),
    path.join(__dirname, '..', '..', 'config', 'empresa.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const j = JSON.parse(fs.readFileSync(p, 'utf8'));
        const list = Array.isArray(j.iva_excluidas) ? j.iva_excluidas : DEFAULT_IVA_EXCLUIDAS;
        excluidasCache = list.map((x) => String(x).toLowerCase().trim()).filter(Boolean);
        return excluidasCache;
      }
    } catch {
      /* next */
    }
  }
  excluidasCache = [...DEFAULT_IVA_EXCLUIDAS];
  return excluidasCache;
}

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * ¿Ítem excluido de IVA? (paneles / inversores / microinversores).
 * @param {{ excluidoIva?: boolean, categoria?: string, category?: string, nombre?: string, title?: string }} item
 * @param {string[]} [excluidas]
 */
export function isExcluidoIva(item, excluidas = loadIvaExcluidas()) {
  if (item && item.excluidoIva === true) return true;
  if (item && item.excluidoIva === false) return false;

  const cat = norm(item?.categoria || item?.category || '');
  const name = norm(item?.nombre || item?.title || '');
  const list = (excluidas || DEFAULT_IVA_EXCLUIDAS).map(norm);

  for (const ex of list) {
    if (!ex) continue;
    if (cat === ex || cat.includes(ex) || (cat && ex.includes(cat))) return true;
  }

  // Respaldo por nombre (ej. JSON de ejemplo sin categoría)
  if (/\bmicroinversor|microinverter|micro-inversor\b/.test(name)) return true;
  if (/\binversor(es)?\b/.test(name)) return true;
  if (/\bpanel(es)?\b/.test(name) && !/\b(protector|proteccion|estructura|cable|conector|cargador)\b/.test(name)) {
    return true;
  }
  return false;
}

/**
 * Totales con redondeo a pesos por línea.
 * @param {Array<object>} items
 * @param {{ envio?: number|null, ivaExcluidas?: string[] }} [opts]
 */
export function calcTotalesConIvaIncluido(items, opts = {}) {
  const excluidas = opts.ivaExcluidas || loadIvaExcluidas();
  let excluido = 0;
  let gravadoConIva = 0;
  let baseGravada = 0;
  let iva = 0;

  for (const it of items || []) {
    const qty = Number(it.quantity ?? it.qty ?? it.cantidad ?? 1) || 1;
    const unit = Math.round(Number(it.price ?? it.precioNum ?? it.precio_unit ?? 0) || 0);
    const line = unit * qty;
    const ex = isExcluidoIva(it, excluidas);
    if (ex) {
      excluido += line;
    } else {
      gravadoConIva += line;
      const baseLine = Math.round(line / (1 + IVA_RATE));
      baseGravada += baseLine;
      iva += line - baseLine;
    }
  }

  const envio = opts.envio == null ? null : Math.round(Number(opts.envio) || 0);
  const envioVal = envio == null ? 0 : envio;
  const total = excluido + gravadoConIva + envioVal;

  return {
    excluido: Math.round(excluido),
    subtotalExento: Math.round(excluido),
    gravadoConIva: Math.round(gravadoConIva),
    baseGravada: Math.round(baseGravada),
    iva: Math.round(iva),
    exento: Math.round(excluido),
    envio,
    total: Math.round(total),
    subtotalConIva: Math.round(excluido + gravadoConIva),
  };
}

/** Formato COP estilo plantilla: $ 1.234.567 */
export function formatCopPdf(v) {
  const n = Math.round(Number(v) || 0);
  return '$ ' + n.toLocaleString('es-CO').replace(/\s/g, '.');
}

/** Formato corto carrito: $1.234.567 */
export function formatCopCart(v) {
  const n = Math.round(Number(v) || 0);
  return '$' + n.toLocaleString('es-CO');
}
