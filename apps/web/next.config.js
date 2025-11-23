/** @type {import('next').NextConfig} */
// La plataforma siempre se despliega en /okr
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/okr';
const isStaticExport = process.env.STATIC_EXPORT === 'true' || process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  reactStrictMode: true,
  basePath: basePath,
  assetPrefix: basePath,
  // Para Vercel con Astro, usar export estático; para servidor, usar standalone
  output: isStaticExport ? 'export' : 'standalone',
  // Asegurar que las rutas funcionen correctamente con el basePath
  trailingSlash: false,
  // Configuración para export estático
  images: {
    unoptimized: true, // Necesario para export estático
  },
};

module.exports = nextConfig;

