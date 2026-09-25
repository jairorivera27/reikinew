/**
 * POST /api/wompi-confirm-pago
 * Body: { id: "<transactionId Wompi>" }
 * Consulta GET /v1/transactions/{id} con WOMPI_PRIVATE_KEY y, si APPROVED + ref cot-{id}-…
 * + monto = total cotización, marca pagada_online (idempotente).
 *
 * El navegador en /respuesta-pago solo envía el id; nunca marca por sí solo.
 */
import { confirmPagoByTransactionId } from './_lib/wompi-confirm.js';

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body || '{}'));
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
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'POST only' }));
  }

  try {
    const body = await readBody(req);
    const q = new URL(req.url || '/', 'http://localhost').searchParams;
    const id = String(body.id || body.transactionId || q.get('id') || '').trim();
    const sandbox = body.env === 'sandbox' || q.get('env') === 'sandbox';
    if (!id) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'id_requerido' }));
    }

    const result = await confirmPagoByTransactionId(id, { sandbox });
    res.statusCode = result.ok ? 200 : 422;
    return res.end(JSON.stringify(result));
  } catch (err) {
    console.error('[wompi-confirm-pago]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 300) }));
  }
}
