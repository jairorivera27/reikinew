/** @type {import('next').NextConfig} */
// La plataforma siempre se despliega en /OKR
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/OKR';

const nextConfig = {
  reactStrictMode: true,
  basePath: basePath,
  assetPrefix: basePath,
  // Configuración para producción en reikisolar.com.co/OKR
  output: 'standalone',
  // Asegurar que las rutas funcionen correctamente con el basePath
  trailingSlash: false,
};

module.exports = nextConfig;

