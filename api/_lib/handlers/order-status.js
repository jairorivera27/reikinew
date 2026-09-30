/**
 * POST /api/checkout?accion=order-status
 * Body: { orderId, workflowStatus: 'nuevo'|'en_revision'|'cerrado' }
 * Header: Authorization: Bearer <ADMIN_ORDERS_SECRET>
 */
import { adminAuthOk, readJsonBody } from '../admin-auth.js';
import { getCheckoutOrder, patchCheckoutOrder } from '../checkout-order-store.js';

const ALLOWED = new Set(['nuevo', 'en_revision', 'cerrado']);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo POST.' }));
  }
  if (!adminAuthOk(req)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: 'No autorizado.' }));
  }

  try {
    const body = await readJsonBody(req);
    const orderId = String(body.orderId || body.id || '').trim();
    const workflowStatus = String(body.workflowStatus || body.estado || '')
      .trim()
      .toLowerCase();

    if (!orderId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'orderId obligatorio.' }));
    }
    if (!ALLOWED.has(workflowStatus)) {
      res.statusCode = 400;
      return res.end(
        JSON.stringify({ ok: false, error: 'workflowStatus inválido (nuevo|en_revision|cerrado).' })
      );
    }

    const prev = await getCheckoutOrder(orderId);
    if (!prev) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ ok: false, error: 'Pedido no encontrado.' }));
    }

    const order = await patchCheckoutOrder(orderId, {
      workflowStatus,
      workflowUpdatedAt: new Date().toISOString(),
    });

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, order }));
  } catch (err) {
    console.error('[order-status]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 200) }));
  }
}
