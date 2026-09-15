/**
 * Middleware Vite: /api/addi-checkout y /api/addi-webhook en `astro dev`
 * (mismas rutas que Vercel serverless).
 */
import { loadEnv } from 'vite';

function injectEnv(mode, envDir) {
  const env = loadEnv(mode, envDir || process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

export function addiApiDevPlugin() {
  return {
    name: 'addi-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathOnly = (req.url || '').split('?')[0];
        if (pathOnly !== '/api/addi-checkout' && pathOnly !== '/api/addi-webhook') {
          next();
          return;
        }

        injectEnv(server.config.mode, server.config.envDir);

        try {
          const mod =
            pathOnly === '/api/addi-webhook'
              ? await import('../../api/addi-webhook.js')
              : await import('../../api/addi-checkout.js');
          await mod.default(req, res);
        } catch (err) {
          console.error('[addi-api-dev]', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: err.message || 'Error Addi local.' }));
          }
        }
      });
    },
  };
}
