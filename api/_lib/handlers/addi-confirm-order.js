/**
 * POST /api/addi-confirm-order → /api/checkout?accion=addi-confirm
 * Cliente regresa de Addi (a menudo sin ?status=APPROVED).
 * Guarda formulario + avisa WhatsApp al dueño (celular).
 */
import { readJsonBody } from '../addi.js';
import { notifyAddiReturnUnverified } from '../checkout-notify.js';

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

    const result = await notifyAddiReturnUnverified(orderId, {
      status: body.status,
      client: body.client,
      items: body.items,
      shippingAddress: body.shippingAddress,
      totalAmount: body.totalAmount,
      applicationId: body.applicationId || body.application_id,
    });

    console.log('[addi-confirm-order]', { orderId, notified: result.notified, phone: result.phone });
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, ...result }));
  } catch (err) {
    console.error('[addi-confirm-order]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: err.message || 'error' }));
  }
}
