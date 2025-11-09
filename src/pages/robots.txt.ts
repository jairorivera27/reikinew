import type { APIRoute } from 'astro';

/**
 * Genera dinámicamente el archivo robots.txt
 * 
 * Este archivo indica a los buscadores qué páginas pueden indexar.
 * 
 * Para modificar las reglas:
 * - Allow: permite indexar rutas específicas
 * - Disallow: bloquea la indexación de rutas específicas
 * - Sitemap: indica la ubicación del sitemap.xml
 * 
 * Ejemplo para bloquear una ruta:
 *   Disallow: /admin/
 *   Disallow: /api/
 */

const site = 'https://reiki-energia-solar.com'; // Cambia esto por tu dominio real

export const GET: APIRoute = () => {
  const robotsTxt = `User-agent: *
Allow: /

# Bloquear acceso a archivos de sistema y API
Disallow: /api/
Disallow: /_astro/

# Sitemap
Sitemap: ${site}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

