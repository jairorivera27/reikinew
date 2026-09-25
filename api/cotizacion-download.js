/**
 * GET /api/cotizacion-download?id=&t=
 * Rewrite: /cotizacion/{id}.pdf?t= → aquí
 * Sin token válido → 404. Regenera PDF desde datos Redis.
 */
import { renderCotizacionPdfBuffer } from './_lib/cotizacion-pdf.js';
import { getCotizacionIfToken, toRenderPayload } from './_lib/cotizacion-store.js';

export const config = {
  maxDuration: 60,
  memory: 1769,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('GET only');
  }

  try {
    const q = new URL(req.url || '/', 'http://localhost').searchParams;
    let id = String(q.get('id') || '').trim();
    const token = String(q.get('t') || q.get('token') || '').trim();

    // Fallback si llega path /cotizacion/xxx.pdf
    if (!id && req.url) {
      const m = String(req.url).match(/\/cotizacion\/([a-zA-Z0-9_-]+)\.pdf/i);
      if (m) id = m[1];
    }

    if (!id || !token) {
      res.statusCode = 404;
      return res.end('Not found');
    }

    const doc = await getCotizacionIfToken(id, token);
    if (!doc) {
      res.statusCode = 404;
      return res.end('Not found');
    }

    const site = String(process.env.WHATSAPP_SITE_URL || process.env.ADDI_SITE_URL || 'https://reikisolar.com.co').replace(
      /\/$/,
      ''
    );
    const payload = toRenderPayload(doc, site);
    const buf = await renderCotizacionPdfBuffer(payload);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Cotizacion-Reiki-${doc.numero}.pdf"`
    );
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.end(buf);
  } catch (err) {
    console.error('[cotizacion-download]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 300) }));
  }
}
