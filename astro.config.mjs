import crypto from 'node:crypto';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { loadEnv } from 'vite';

/** Firma Wompi en desarrollo (misma ruta que en Vercel: /api/wompi-integrity). */
function wompiIntegrityDevPlugin() {
  return {
    name: 'wompi-integrity-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathOnly = (req.url || '').split('?')[0];
        if (pathOnly !== '/api/wompi-integrity') {
          next();
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'Solo se admite POST.' }));
          return;
        }
        const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
        const secret = String(env.WOMPI_INTEGRITY_SECRET || '').trim();
        if (!secret) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              ok: false,
              error: 'Falta WOMPI_INTEGRITY_SECRET en .env (panel Wompi → Desarrolladores → Secreto de integridad).',
            })
          );
          return;
        }
        try {
          const raw = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on('data', (c) => chunks.push(c));
            req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            req.on('error', reject);
          });
          const body = JSON.parse(raw || '{}');
          const reference = body.reference;
          const amountInCents = body.amountInCents;
          const currency = body.currency != null ? String(body.currency) : 'COP';
          if (reference == null || reference === '' || amountInCents == null || Number.isNaN(Number(amountInCents))) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: 'reference y amountInCents son obligatorios.' }));
            return;
          }
          const concat = String(reference) + String(amountInCents) + currency + secret;
          const integrity = crypto.createHash('sha256').update(concat, 'utf8').digest('hex');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: true, integrity }));
        } catch (_e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'No se pudo generar la firma de integridad.' }));
        }
      });
    },
  };
}

export default defineConfig({
  output: 'static', // Mantener static - los endpoints API funcionan en desarrollo
  site: 'https://reikisolar.com.co',
  prefetch: true,
  integrations: [react()],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
    assets: '_assets',
  },
  vite: {
    plugins: [wompiIntegrityDevPlugin()],
    build: {
      cssMinify: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
  },
});
