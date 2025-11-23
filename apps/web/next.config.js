/** @type {import('next').NextConfig} */
// La plataforma siempre se despliega en /OKR
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/OKR';
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  reactStrictMode: true,
  basePath: basePath,
  assetPrefix: basePath,
  // Para GitHub Pages, usar export estático; para servidor, usar standalone
  output: isGitHubPages ? 'export' : 'standalone',
  // Asegurar que las rutas funcionen correctamente con el basePath
  trailingSlash: false,
  // Configuración para export estático
  images: {
    unoptimized: true, // Necesario para export estático
  },
  // Deshabilitar middleware cuando se usa export estático
  ...(isGitHubPages && {
    // No se puede usar middleware con export estático
    // La redirección se manejará en el cliente
  }),
};

module.exports = nextConfig;

