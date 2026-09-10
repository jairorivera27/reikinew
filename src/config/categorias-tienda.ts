/**
 * Acceso tipado a la configuración de categorías de la tienda.
 * Editá src/config/categorias-tienda.json, no este archivo.
 */
import config from './categorias-tienda.json';

export interface CategoriaTienda {
  id: string;
  nombre: string;
  slug: string;
  icono: string;
  orden: number;
  tipoSingular: string;
  imagenPorDefecto: string;
  descripcionSeo: string;
}

export const CATEGORIAS: CategoriaTienda[] = [...config.categorias].sort((a, b) => a.orden - b.orden);

export const CATEGORIA_IDS = CATEGORIAS.map((c) => c.id);

const porId = new Map(CATEGORIAS.map((c) => [c.id, c]));
const porSlug = new Map(CATEGORIAS.map((c) => [c.slug, c]));

export function getCategoria(id: string): CategoriaTienda | undefined {
  return porId.get(id);
}

export function getCategoriaPorSlug(slug: string): CategoriaTienda | undefined {
  return porSlug.get(slug);
}

export function nombreCategoria(id: string): string {
  return porId.get(id)?.nombre ?? 'Equipos Solares';
}

export function slugCategoria(id: string): string {
  return porId.get(id)?.slug ?? id;
}

/** URL pública del listado de una categoría. */
export function urlCategoria(id: string): string {
  return `/tienda/categoria/${slugCategoria(id)}`;
}

/** URL pública de la ficha de un producto. */
export function urlProducto(slug: string): string {
  return `/tienda/${slug}`;
}

/** Productos por página en los listados de categoría. */
export const PRODUCTOS_POR_PAGINA = 24;
