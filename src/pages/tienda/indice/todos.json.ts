import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { CATEGORIAS, urlProducto } from '../../../config/categorias-tienda';
import { formatTipoPotenciaLine } from '../../../utils/productCardCompactMeta';
import { precioNumero } from '../../../utils/calidadPrecio';

/**
 * Índice ligero de TODOS los productos de la tienda para la barra de búsqueda en /tienda.
 */
export const GET: APIRoute = async () => {
  const productos = await getCollection('productos', ({ data }) => data.draft !== true);
  const nombreCat = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.nombre]));

  const items = productos.map((p) => {
    const meta = { brand: p.data.brand, model: p.data.model, power: p.data.power };
    return {
      slug: p.slug,
      url: urlProducto(p.slug),
      title: p.data.title,
      brand: p.data.brand ?? '',
      model: p.data.model ?? '',
      power: p.data.power ?? '',
      tipoPotencia: formatTipoPotenciaLine(String(p.data.category), p.data.title, meta),
      category: p.data.category,
      categoryName: nombreCat[p.data.category] ?? p.data.category,
      image: p.data.image,
      price: p.data.price,
      priceNum: precioNumero(p.data.price),
      stock: p.data.stock ?? 'disponible',
    };
  });

  return new Response(JSON.stringify({ total: items.length, items }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
