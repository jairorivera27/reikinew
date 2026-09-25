/**
 * POST /api/cotizacion-pdf
 * Body JSON: cotización guardada o payload { empresa, cotizacion, cliente, items, envio }
 * Query ?id=&t= regenera desde Redis.
 * memory 1769 / maxDuration 60 (vercel.json)
 */
import { renderCotizacionPdfBuffer } from './_lib/cotizacion-pdf.js';
import { getCotizacionIfToken, toRenderPayload } from './_lib/cotizacion-store.js';

export const config = {
  maxDuration: 60,
  memory: 1769,
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body));
      } catch {
        return resolve({});
      }
    }
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    return res.end('Method not allowed');
  }

  try {
    const q = new URL(req.url || '/', 'http://localhost').searchParams;
    let datos = null;

    const id = q.get('id');
    const token = q.get('t') || q.get('token');
    if (id && token) {
      const doc = await getCotizacionIfToken(id, token);
      if (!doc) {
        res.statusCode = 404;
        return res.end('Not found');
      }
      const site = String(process.env.WHATSAPP_SITE_URL || 'https://reikisolar.com.co').replace(/\/$/, '');
      datos = toRenderPayload(doc, site);
    } else if (req.method === 'POST') {
      datos = await readBody(req);
    }

    if (!datos || (!datos.items && !datos.cotizacion)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: false, error: 'payload o id+t requeridos' }));
    }

    const buf = await renderCotizacionPdfBuffer(datos);
    const numero = datos.cotizacion?.numero || datos.numero || 'cotizacion';
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Cotizacion-Reiki-${numero}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.end(buf);
  } catch (err) {
    console.error('[cotizacion-pdf] error', err);
    const msg = String(err?.message || err);
    // Señal clara si Chromium no cabe / falla en Vercel
    if (/Executable doesn't exist|Failed to launch|ENOSPC|Cannot find module '@sparticuz/i.test(msg)) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({
          ok: false,
          error: 'chromium_unavailable',
          detail: msg.slice(0, 300),
          hint: 'Chromium no disponible o demasiado pesado en este hosting — no cambiar librería sin avisar.',
        })
      );
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: msg.slice(0, 400) }));
  }
}
