/**
 * Vista transversal de los equipos rebajados.
 *
 * No es una categoría del catálogo: cada producto conserva la suya (un panel rebajado
 * sigue siendo un panel). Es un listado aparte que los reúne para que la oferta sea
 * fácil de encontrar.
 */
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export const DESCUENTOS_URL = '/tienda/descuentos';
export const DESCUENTOS_NOMBRE = 'Descuentos';
export const DESCUENTOS_ICONO = 'fas fa-tags';

export type ProductoRebajado = CollectionEntry<'productos'>;

/** Un producto está rebajado cuando tiene precio anterior y porcentaje de descuento. */
export function estaRebajado(data: CollectionEntry<'productos'>['data']): boolean {
  return Boolean(data.precioAnterior && data.descuentoPct);
}

/** Rebajados publicados, del descuento más alto al más bajo. */
export async function getProductosRebajados(): Promise<ProductoRebajado[]> {
  const productos = await getCollection(
    'productos',
    ({ data }) => data.draft !== true && estaRebajado(data)
  );
  return productos.sort((a, b) => (b.data.descuentoPct ?? 0) - (a.data.descuentoPct ?? 0));
}

/** Cuánto se ahorra en pesos, para mostrarlo junto al porcentaje. */
export function ahorroEnPesos(data: CollectionEntry<'productos'>['data']): number {
  const antes = parseInt(String(data.precioAnterior ?? '').replace(/[^0-9]/g, ''), 10) || 0;
  const ahora = parseInt(String(data.price).replace(/[^0-9]/g, ''), 10) || 0;
  return Math.max(0, antes - ahora);
}

export function formatearCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}
