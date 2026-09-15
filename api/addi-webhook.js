/**
 * Webhook Addi: notifica estado de la solicitud de crédito.
 * POST /api/addi-webhook
 *
 * Body típico: { orderId, status, applicationId }
 * status: APPROVED | COMPLETED | REJECTED | DECLINED | ABANDONED | PENDING
 *
 * Por ahora registra el evento (log). Puedes conectar email/CRM después.
 */
import { readJsonBody } from './_lib/addi.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo se admite POST.' }));
  }

  try {
    const body = await readJsonBody(req);
    const orderId = String(body.orderId || body.order_id || '').trim();
    const status = String(body.status || '').trim().toUpperCase();
    const applicationId = String(body.applicationId || body.application_id || '').trim();

    console.log('[addi-webhook]', { orderId, status, applicationId, body });

    // Responder 200 rápido para que Addi no reintente en exceso.
    res.statusCode = 200;
    return res.end(
      JSON.stringify({
        ok: true,
        received: true,
        orderId,
        status,
        applicationId,
      })
    );
  } catch (err) {
    console.error('[addi-webhook]', err);
    res.statusCode = 200; // evitar storm de retries por body malformado
    return res.end(JSON.stringify({ ok: false, error: 'parse_error' }));
  }
}
