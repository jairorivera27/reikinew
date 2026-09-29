/**
 * POST /api/addi-confirm-order
 * El cliente vuelve de Addi con ?status=APPROVED. Como eso viene del navegador (falsificable),
 * NO marca el pedido como pagado: solo avisa al dueño "sin confirmar". El pago real lo confirma addi-webhook.
 * Body: { orderId, status? }
 */
import { readJsonBody } from './_lib/addi.js';
import { notifyAddiReturnUnverified } from './_lib/checkout-notify.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo POST.' }));
  }

  try {
    const body = await readJsonBody(req);
    const orderId = String(body.orderId || '').trim();
    if (!orderId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'orderId obligatorio.' }));
    }

    const result = await notifyAddiReturnUnverified(orderId);

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, ...result }));
  } catch (err) {
    console.error('[addi-confirm-order]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: err.message || 'error' }));
  }
}
