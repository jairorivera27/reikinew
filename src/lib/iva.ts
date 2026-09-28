/**
 * IVA compartido (espejo de api/_lib/iva.js).
 * precio_final: paneles, inversores, reflectores, bombeo — sin IVA adicional.
 * resto: IVA = redondeo(precio × 0.19) por ítem; total = precio + IVA.
 */
export const DEFAULT_IVA_TASA = 0.19;
export const DEFAULT_PRECIO_FINAL = ['paneles', 'inversores', 'reflectores', 'bombeo'];

export const IVA_NOTA =
  'Paneles, inversores, reflectores y bombeo solar: precio final. Los demás productos: se adiciona IVA del 19 %.';

export type LineaIva = {
  price: number;
  quantity?: number;
  qty?: number;
  cantidad?: number;
  precioFinal?: boolean;
  excluidoIva?: boolean;
  categoria?: string;
  category?: string;
  nombre?: string;
  title?: string;
};

function norm(s: string) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function isPrecioFinal(
  item: LineaIva,
  precioFinalCats: string[] = DEFAULT_PRECIO_FINAL
): boolean {
  if (item?.precioFinal === true || item?.excluidoIva === true) return true;
  if (item?.precioFinal === false || item?.excluidoIva === false) return false;

  const cats = (precioFinalCats || DEFAULT_PRECIO_FINAL).map(norm);
  const cat = norm(item?.categoria || item?.category || '');
  const name = norm(item?.nombre || item?.title || '');

  for (const pf of cats) {
    if (!pf) continue;
    if (cat === pf || cat.includes(pf) || (cat && pf.includes(cat))) return true;
  }
  if (/\bmicroinversor|microinverter|micro-inversor\b/.test(name)) return true;
  if (/\binversor(es)?\b/.test(name)) return true;
  if (/\bpanel(es)?\b/.test(name) && !/\b(protector|proteccion|estructura|cable|conector|cargador)\b/.test(name)) {
    return true;
  }
  if (/\b(reflector|luminaria|lampara|lámpara)\b/.test(name)) return true;
  if (/\b(bomba|bombeo)\b/.test(name)) return true;
  return false;
}

/** @deprecated Preferir isPrecioFinal */
export function isExcluidoIva(item: LineaIva, list?: string[]) {
  return isPrecioFinal(item, list);
}

export function calcTotalesIva(
  items: LineaIva[],
  opts: { envio?: number | null; precioFinal?: string[]; tasa?: number } = {}
) {
  const precioFinal = opts.precioFinal || DEFAULT_PRECIO_FINAL;
  const tasa = opts.tasa && opts.tasa > 0 ? opts.tasa : DEFAULT_IVA_TASA;
  let subtotal = 0;
  let iva = 0;
  let subtotalPrecioFinal = 0;
  let subtotalGravado = 0;

  for (const it of items || []) {
    const qty = Number(it.quantity ?? it.qty ?? it.cantidad ?? 1) || 1;
    const unit = Math.round(Number(it.price || 0) || 0);
    const line = unit * qty;
    subtotal += line;
    if (isPrecioFinal(it, precioFinal)) {
      subtotalPrecioFinal += line;
    } else {
      subtotalGravado += line;
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
    excluido: Math.round(subtotalPrecioFinal),
    baseGravada: Math.round(subtotalGravado),
    gravadoConIva: Math.round(subtotalGravado),
    subtotalConIva: Math.round(subtotal),
  };
}

/** @deprecated Preferir calcTotalesIva */
export function calcTotalesConIvaIncluido(
  items: LineaIva[],
  opts: { envio?: number | null; ivaExcluidas?: string[] } = {}
) {
  return calcTotalesIva(items, {
    envio: opts.envio,
    precioFinal: opts.ivaExcluidas,
  });
}

export function formatCopCart(v: number) {
  const n = Math.round(Number(v) || 0);
  return '$' + n.toLocaleString('es-CO');
}
