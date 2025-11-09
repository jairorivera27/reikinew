import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * Genera dinámicamente el sitemap.xml para SEO
 * 
 * Este archivo se ejecuta en build time y genera todas las URLs del sitio.
 * 
 * Para agregar rutas dinámicas en el futuro:
 * 1. Obtén las rutas dinámicas usando getCollection() o getStaticPaths()
 * 2. Agrega cada ruta al array 'pages' con su lastmod y changefreq
 * 3. Ejemplo para productos dinámicos:
 *    const productos = await getCollection('productos');
 *    productos.forEach(producto => {
 *      pages.push({
 *        url: `${site}/tienda/${producto.slug}`,
 *        lastmod: producto.data.updatedAt || new Date().toISOString(),
 *        changefreq: 'weekly',
 *        priority: '0.8'
 *      });
 *    });
 */

const site = 'https://reiki-energia-solar.com'; // Cambia esto por tu dominio real

export const GET: APIRoute = async () => {
  // Obtener todas las entradas de colecciones dinámicas
  const servicios = await getCollection('servicios');
  const blogPosts = await getCollection('blog');

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

  // Combinar todas las páginas
  const allPages = [...staticPages, ...servicioPages, ...blogPages];

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

