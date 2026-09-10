/**
 * Meta tags, JSON-LD y breadcrumbs de las fichas de producto y listados de categoría.
 */
import { getCategoria, urlCategoria, urlProducto } from '../config/categorias-tienda';

export const SITE = 'https://reikisolar.com.co';
export const SUFIJO_TITLE = ' | Reiki Solar';

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 155;

export interface ProductoSeoData {
  title: string;
  description: string;
  image: string;
  category: string;
  price: string;
  brand?: string;
  model?: string;
  sku?: string;
  power?: string;
  stock?: string;
  specifications?: string[];
  seoTitle?: string;
  seoDescription?: string;
}

/** Recorta en el último espacio antes del límite para no partir palabras. */
function recortar(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max);
  const espacio = corte.lastIndexOf(' ');
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).trim();
}

/**
 * Recorta prefiriendo el final de una frase, para que la meta description no quede
 * partida en medio de una enumeración.
 */
function recortarEnFrase(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;

  const corte = limpio.slice(0, max);
  const finDeFrase = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('; '));
  if (finDeFrase > max * 0.5) return corte.slice(0, finDeFrase + 1).replace(/;$/, '.').trim();

  return `${recortar(limpio, max - 1).replace(/[,;:.]$/, '')}…`;
}

/** Precio en COP como entero, desde el string formateado del frontmatter ("$5.584.500"). */
export function precioNumerico(price: string): number {
  const n = parseInt(String(price ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Meta title de máx. 60 caracteres: Tipo + Marca + Especificación principal. */
export function metaTitleProducto(d: ProductoSeoData): string {
  if (d.seoTitle) return recortar(d.seoTitle, MAX_TITLE);

  const tipo = getCategoria(d.category)?.tipoSingular ?? 'Equipo solar';
  const partes = [tipo, d.brand, d.power || d.model].filter(Boolean).join(' ');
  return `${recortar(partes, MAX_TITLE - SUFIJO_TITLE.length)}${SUFIJO_TITLE}`;
}

/** Meta description de máx. 155 caracteres, tomada de la descripción del producto. */
export function metaDescriptionProducto(d: ProductoSeoData): string {
  return recortarEnFrase(d.seoDescription || d.description, MAX_DESCRIPTION);
}

function disponibilidadSchema(stock?: string): string {
  if (stock === 'agotado') return 'https://schema.org/OutOfStock';
  if (stock === 'pre-orden') return 'https://schema.org/PreOrder';
  return 'https://schema.org/InStock';
}

/** JSON-LD Schema.org tipo Product para la ficha. */
export function productJsonLd(d: ProductoSeoData, slug: string): Record<string, unknown> {
  const categoria = getCategoria(d.category);
  const precio = precioNumerico(d.price);
  const url = `${SITE}${urlProducto(slug)}`;

  const schema: Record<string, unknown> = {
    '@type': 'Product',
    name: d.title,
    description: metaDescriptionProducto(d),
    image: `${SITE}${d.image}`,
    category: categoria?.nombre ?? 'Equipos Solares',
    url,
    offers: {
      '@type': 'Offer',
      url,
      price: String(precio),
      priceCurrency: 'COP',
      availability: disponibilidadSchema(d.stock),
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Reiki Energía Solar' },
    },
  };

  if (d.brand) schema.brand = { '@type': 'Brand', name: d.brand };
  if (d.sku || d.model) schema.sku = d.sku || d.model;
  if (d.model) schema.mpn = d.model;

  const specs = (d.specifications ?? []).filter(Boolean);
  if (specs.length > 0) {
    schema.additionalProperty = specs.slice(0, 12).map((linea) => {
      const [nombre, ...resto] = linea.split(':');
      const valor = resto.join(':').trim();
      return {
        '@type': 'PropertyValue',
        name: valor ? nombre.trim() : 'Especificación',
        value: valor || linea.trim(),
      };
    });
  }

  return schema;
}

export interface Miga {
  nombre: string;
  url: string;
}

/** Inicio > Tienda > Categoría > Producto */
export function migasProducto(d: ProductoSeoData, slug: string): Miga[] {
  const categoria = getCategoria(d.category);
  return [
    { nombre: 'Inicio', url: '/' },
    { nombre: 'Tienda', url: '/tienda' },
    { nombre: categoria?.nombre ?? 'Equipos Solares', url: urlCategoria(d.category) },
    { nombre: d.title, url: urlProducto(slug) },
  ];
}

export function breadcrumbJsonLd(migas: Miga[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: migas.map((miga, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: miga.nombre,
      item: `${SITE}${miga.url}`,
    })),
  };
}
