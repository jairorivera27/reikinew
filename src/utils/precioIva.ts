/**
 * Helpers de precio / IVA para tarjetas y fichas (frontend).
 */
import { isPrecioFinal, DEFAULT_PRECIO_FINAL } from '../lib/iva';

export function productoMuestraMasIva(category?: string, title?: string): boolean {
  return !isPrecioFinal(
    { categoria: category, nombre: title },
    DEFAULT_PRECIO_FINAL
  );
}

export function etiquetaPrecioConIva(price: string, category?: string, title?: string): string {
  const p = String(price || '').trim();
  if (!p) return p;
  if (productoMuestraMasIva(category, title)) return `${p} + IVA`;
  return p;
}
