/**
 * Webhook Addi: notifica estado de la solicitud de crédito.
 * POST /api/addi-webhook
 *
 * Body típico: { orderId, status, applicationId }
 * status: APPROVED | COMPLETED | REJECTED | DECLINED | ABANDONED | PENDING
 */
import { readJsonBody } from './_lib/addi.js';
import { markCheckoutPaidFromAddi } from './_lib/checkout-notify.js';
import { patchCheckoutOrder, getCheckoutOrder } from './_lib/checkout-order-store.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo se admite POST.' }));
  }

  // Token opcional: si ADDI_WEBHOOK_TOKEN existe, addi-checkout lo pone en el callbackUrl (?t=)
  const expectedToken = String(process.env.ADDI_WEBHOOK_TOKEN || '').trim();
  if (expectedToken) {
    const t = new URL(req.url || '/', 'http://localhost').searchParams.get('t') || '';
    if (t !== expectedToken) {
      console.warn('[addi-webhook] token inválido');
      res.statusCode = 401;
      return res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
    }
  }

  try {
    const body = await readJsonBody(req);
    const orderId = String(body.orderId || body.order_id || '').trim();
    const status = String(body.status || '').trim().toUpperCase();
    const applicationId = String(body.applicationId || body.application_id || '').trim();

    console.log('[addi-webhook]', { orderId, status, applicationId, body });

    let notifyResult = null;
    if (orderId && (status === 'APPROVED' || status === 'COMPLETED')) {
      notifyResult = await markCheckoutPaidFromAddi(orderId, { status, applicationId });
    } else if (orderId && status) {
      const prev = await getCheckoutOrder(orderId);
      if (prev) {
        await patchCheckoutOrder(orderId, {
          status: status.toLowerCase(),
          addiApplicationId: applicationId || prev.addiApplicationId,
        });
      }
    }

    console.log('[addi-webhook] resultado aviso', notifyResult);
    // Addi espera HTTP 200 con el mismo cuerpo que envió; si no, reintenta / marca fallo.
    res.statusCode = 200;
    return res.end(JSON.stringify(body));
  } catch (err) {
    console.error('[addi-webhook]', err);
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: false, error: 'parse_error' }));
  }
}
