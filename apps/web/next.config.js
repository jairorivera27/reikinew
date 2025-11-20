/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || (isProduction ? '/OKR' : '');

const nextConfig = {
  reactStrictMode: true,
  ...(basePath && {
    basePath: basePath,
    assetPrefix: basePath,
  }),
  // En desarrollo, puedes usar NEXT_PUBLIC_BASE_PATH=/OKR para probar
  // En producción, se usará automáticamente /OKR
};

module.exports = nextConfig;

