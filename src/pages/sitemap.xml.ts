import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { CATEGORIAS, PRODUCTOS_POR_PAGINA, urlCategoria, urlProducto } from '../config/categorias-tienda';
import { DESCUENTOS_URL } from '../utils/descuentos';

/**
 * Genera dinámicamente el sitemap.xml para SEO.
 *
 * Se ejecuta en build time e incluye páginas estáticas, servicios, blog,
 * listados de categoría (con sus páginas 2, 3, …) y la ficha de cada producto.
 * Los productos en borrador quedan fuera.
 */

const site = 'https://reikisolar.com.co';

export const GET: APIRoute = async () => {
  // Obtener todas las entradas de colecciones dinámicas
  const servicios = await getCollection('servicios');
  const blogPosts = await getCollection('blog');
  const productos = await getCollection('productos', ({ data }) => data.draft !== true);

  // Páginas estáticas - Optimizadas para SEO de energía solar en Colombia/Medellín
  const staticPages = [
    {
      url: `${site}/`,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: '1.0' // Página principal - máxima prioridad
    },
    {
      url: `${site}/tienda`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: '0.9' // Tienda - alta prioridad para búsquedas de productos
    },
    {
      url: `${site}/servicios`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: '0.9' // Servicios - alta prioridad
    },
    {
      url: `${site}/contacto`,
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: '0.8' // Contacto - importante para conversión
    },
    {
      url: `${site}/mapa-solar`,
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: '0.8' // Calculadora - herramienta útil
    },
    {
      url: `${site}/blog`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: '0.7' // Blog - contenido fresco
    },
    {
      url: `${site}/quienes-somos`,
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: '0.6' // Sobre nosotros
    }
  ];

  // Páginas dinámicas de servicios - Optimizadas para SEO
  const servicioPages = servicios.map(servicio => ({
    url: `${site}/servicios/${servicio.slug}`,
    lastmod: new Date().toISOString(),
    changefreq: 'weekly',
    priority: '0.8' // Servicios individuales - importante para long-tail keywords
  }));

  // Páginas dinámicas de blog - Optimizadas para contenido
  const blogPages = blogPosts.map(post => ({
    url: `${site}/blog/${post.slug}`,
    lastmod: new Date(post.data.date).toISOString(),
    changefreq: 'monthly',
    priority: post.data.featured ? '0.8' : '0.6' // Posts destacados tienen mayor prioridad
  }));

  // Listados de categoría, incluidas las páginas 2, 3, … de cada una
  const categoriaPages = CATEGORIAS.flatMap((categoria) => {
    const total = productos.filter((p) => p.data.category === categoria.id).length;
    if (total === 0) return [];

    const base = urlCategoria(categoria.id);
    const ultimaPagina = Math.ceil(total / PRODUCTOS_POR_PAGINA);

    return Array.from({ length: ultimaPagina }, (_, i) => ({
      url: `${site}${i === 0 ? base : `${base}/${i + 1}`}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      // La primera página de cada categoría es la que queremos posicionar
      priority: i === 0 ? '0.9' : '0.5',
    }));
  });

  // Listado de rebajados: solo se publica si hay ofertas vigentes
  const rebajados = productos.filter((p) => p.data.precioAnterior && p.data.descuentoPct);
  const descuentoPages =
    rebajados.length > 0
      ? [
          {
            url: `${site}${DESCUENTOS_URL}`,
            lastmod: new Date().toISOString(),
            changefreq: 'daily',
            priority: '0.9',
          },
        ]
      : [];

  // Fichas individuales de producto
  const productoPages = productos.map((producto) => ({
    url: `${site}${urlProducto(producto.slug)}`,
    lastmod: producto.data.updatedAt
      ? new Date(producto.data.updatedAt).toISOString()
      : new Date().toISOString(),
    changefreq: 'weekly',
    priority: '0.7',
  }));

  // Combinar todas las páginas
  const allPages = [
    ...staticPages,
    ...descuentoPages,
    ...categoriaPages,
    ...productoPages,
    ...servicioPages,
    ...blogPages,
  ];

  // Generar XML del sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

