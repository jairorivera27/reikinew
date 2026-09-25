/**
 * Webhook de eventos Wompi (transaction.updated).
 *
 * URL a registrar en el panel Wompi (Mi cuenta → Desarrolladores → Eventos):
 *   https://reikisolar.com.co/api/wompi-events
 *   (o https://www.reikisolar.com.co/api/wompi-events si el canonical es www)
 *
 * Variable de entorno: WOMPI_EVENTS_SECRET
 *   = "Secreto de eventos" del dashboard (NO es la llave privada prv_ ni la pública pub_).
 *
 * Valida signature.checksum / X-Event-Checksum; sin firma válida → 401.
 * Verifica monto vs total de la cotización. Aviso al dueño idempotente.
 */
import { verifyWompiEventSignature, confirmPagoFromWompiTransaction } from './_lib/wompi-confirm.js';

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body != null) {
      if (typeof req.body === 'string') return resolve(req.body);
      if (Buffer.isBuffer(req.body)) return resolve(req.body.toString('utf8'));
      if (typeof req.body === 'object') return resolve(JSON.stringify(req.body));
    }
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }

  try {
    const raw = await readRawBody(req);
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'invalid_json' }));
    }

    const secret = String(process.env.WOMPI_EVENTS_SECRET || '').trim();
    const headerChecksum = req.headers['x-event-checksum'] || req.headers['X-Event-Checksum'];
    const sig = verifyWompiEventSignature(body, headerChecksum, secret);
    if (!sig.ok) {
      console.warn('[wompi-events] firma inválida', sig.reason);
      res.statusCode = 401;
      return res.end(JSON.stringify({ ok: false, error: 'invalid_signature', reason: sig.reason }));
    }

    const event = body.event || '';
    const tx = body.data?.transaction || body.data || {};
    const status = String(tx.status || '').toUpperCase();
    const reference = String(tx.reference || '').trim();

    console.log('[wompi-events]', {
      event,
      status,
      reference: reference.slice(0, 80),
      amount: tx.amount_in_cents,
    });

    if (event === 'transaction.updated' || status === 'APPROVED') {
      if (status === 'APPROVED') {
        const result = await confirmPagoFromWompiTransaction(tx, {
          transactionId: tx.id,
          reference,
        });
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true, result }));
      }
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, ignored: true }));
  } catch (err) {
    console.error('[wompi-events]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 200) }));
  }
}
