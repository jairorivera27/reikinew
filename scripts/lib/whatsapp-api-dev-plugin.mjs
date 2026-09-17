/**
 * Middleware Vite: /api/whatsapp-webhook en `astro dev`.
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

export function whatsappApiDevPlugin() {
  return {
    name: 'whatsapp-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathOnly = (req.url || '').split('?')[0];
        if (pathOnly !== '/api/whatsapp-webhook') {
          next();
          return;
        }

        injectEnv(server.config.mode, server.config.envDir);

        try {
          const mod = await import('../../api/whatsapp-webhook.js');
          await mod.default(req, res);
        } catch (err) {
          console.error('[whatsapp-api-dev]', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: err.message || 'Error WhatsApp local.' }));
          }
        }
      });
    },
  };
}
