/**
 * IVA compartido (espejo de api/_lib/iva.js) — paneles/inversores excluidos.
 */
export const IVA_RATE = 0.19;
export const DEFAULT_IVA_EXCLUIDAS = ['paneles', 'inversores'];

export type LineaIva = {
  price: number;
  quantity?: number;
  qty?: number;
  cantidad?: number;
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

/** En el navegador: pasa ivaExcluidas desde data-attribute o default. */
export function isExcluidoIva(item: LineaIva, excluidas: string[] = DEFAULT_IVA_EXCLUIDAS): boolean {
  if (item?.excluidoIva === true) return true;
  if (item?.excluidoIva === false) return false;

  const cat = norm(item?.categoria || item?.category || '');
  const name = norm(item?.nombre || item?.title || '');
  const list = (excluidas || DEFAULT_IVA_EXCLUIDAS).map(norm);

  for (const ex of list) {
    if (!ex) continue;
    if (cat === ex || cat.includes(ex) || (cat && ex.includes(cat))) return true;
  }
  if (/\bmicroinversor|microinverter|micro-inversor\b/.test(name)) return true;
  if (/\binversor(es)?\b/.test(name)) return true;
  if (/\bpanel(es)?\b/.test(name) && !/\b(protector|proteccion|estructura|cable|conector|cargador)\b/.test(name)) {
    return true;
  }
  return false;
}

export function calcTotalesConIvaIncluido(
  items: LineaIva[],
  opts: { envio?: number | null; ivaExcluidas?: string[] } = {}
) {
  const excluidas = opts.ivaExcluidas || DEFAULT_IVA_EXCLUIDAS;
  let excluido = 0;
  let gravadoConIva = 0;
  let baseGravada = 0;
  let iva = 0;

  for (const it of items || []) {
    const qty = Number(it.quantity ?? it.qty ?? it.cantidad ?? 1) || 1;
    const unit = Math.round(Number(it.price || 0) || 0);
    const line = unit * qty;
    if (isExcluidoIva(it, excluidas)) {
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

export function formatCopCart(v: number) {
  const n = Math.round(Number(v) || 0);
  return '$' + n.toLocaleString('es-CO');
}
