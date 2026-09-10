import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { CATEGORIAS } from '../../../config/categorias-tienda';
import { calcularValor, precioNumero } from '../../../utils/calidadPrecio';
import {
  formatTipoPotenciaLine,
  ordenTipoInversor,
  potenciaEnVatios,
} from '../../../utils/productCardCompactMeta';
import { tipoInversorParaFiltro } from '../../../utils/facetasCategoria';

/**
 * Índice ligero de cada categoría, para que los filtros del listado trabajen sobre el
 * catálogo completo y no solo sobre la página visible. Se descarga bajo demanda, la
 * primera vez que el usuario toca un filtro.
 */
export const getStaticPaths = (async () => {
  const productos = await getCollection('productos', ({ data }) => data.draft !== true);

  return CATEGORIAS.filter((categoria) =>
    productos.some((p) => p.data.category === categoria.id)
  ).map((categoria) => ({
    params: { categoria: categoria.slug },
    props: { categoriaId: categoria.id },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { categoriaId } = props as { categoriaId: string };

  const productos = (await getCollection('productos', ({ data }) => data.draft !== true)).filter(
    (p) => p.data.category === categoriaId
  );

  const valores = calcularValor(
    productos.map((p) => ({ slug: p.slug, ...p.data }))
  );

  const items = productos.map((p) => {
    const valor = valores.get(p.slug);
    const meta = { brand: p.data.brand, model: p.data.model, power: p.data.power };
    return {
      slug: p.slug,
      title: p.data.title,
      tipoPotencia: formatTipoPotenciaLine(String(p.data.category), p.data.title, meta),
      brand: p.data.brand ?? '',
      model: p.data.model ?? '',
      image: p.data.image,
      price: p.data.price,
      priceNum: precioNumero(p.data.price),
      precioAnterior: p.data.precioAnterior ?? null,
      descuentoPct: p.data.descuentoPct ?? null,
      power: p.data.power ?? '',
      magnitud: valor?.magnitud ?? null,
      precioPorUnidad: valor?.precioPorUnidad ?? null,
      puntaje: valor?.puntaje ?? 0,
      destacado: valor?.destacado ?? false,
      stock: p.data.stock ?? 'disponible',
      description: p.data.description,
      // Solo relevantes para inversores; el cliente los usa en el orden por defecto.
      ordenTipo:
        categoriaId === 'inversores'
          ? ordenTipoInversor(p.data.title, p.data.model, p.data.brand)
          : null,
      potenciaW:
        categoriaId === 'inversores' ? potenciaEnVatios(p.data.title, meta) : null,
      tipoInversor:
        categoriaId === 'inversores'
          ? tipoInversorParaFiltro(p.data.title, p.data.model, p.data.brand)
          : null,
    };
  });

  const unidad = [...valores.values()].find((v) => v.unidad !== null)?.unidad ?? null;

  const ordenados =
    categoriaId === 'inversores'
      ? items.sort((a, b) => {
          const oa = a.ordenTipo ?? 9;
          const ob = b.ordenTipo ?? 9;
          if (oa !== ob) return oa - ob;
          const pa = a.potenciaW ?? Number.POSITIVE_INFINITY;
          const pb = b.potenciaW ?? Number.POSITIVE_INFINITY;
          if (pa !== pb) return pa - pb;
          return a.title.localeCompare(b.title, 'es');
        })
      : items.sort((a, b) => b.puntaje - a.puntaje);

  return new Response(
    JSON.stringify({
      categoria: categoriaId,
      unidad,
      total: ordenados.length,
      items: ordenados,
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
};
