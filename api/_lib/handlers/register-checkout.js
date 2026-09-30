/**
 * POST /api/register-checkout
 * Guarda snapshot del carrito antes de Wompi (Addi guarda en addi-checkout).
 * Body: { orderId, gateway?, totalAmount, items[], client{}, shippingAddress? }
 */
import { readJsonBody } from '../addi.js';
import { saveCheckoutOrder, cleanDoc } from '../checkout-order-store.js';
import { isRedisConfigured } from '../whatsapp-redis.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo POST.' }));
  }

  if (!isRedisConfigured()) {
    console.error('[register-checkout] Redis/KV no configurado — el pedido no persistirá entre instancias.');
    res.statusCode = 503;
    return res.end(
      JSON.stringify({
        ok: false,
        error: 'Almacenamiento de pedidos no configurado (KV_REST_API_URL/TOKEN).',
        code: 'REDIS_NOT_CONFIGURED',
      })
    );
  }

  try {
    const body = await readJsonBody(req);
    const orderId = String(body.orderId || body.reference || '').trim();
    const totalAmount = Number(body.totalAmount);
    const items = Array.isArray(body.items) ? body.items : [];
    const clientIn = body.client || {};

    if (!orderId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'orderId es obligatorio.' }));
    }
    if (!Number.isFinite(totalAmount) || totalAmount < 1000) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'totalAmount inválido.' }));
    }
    if (!items.length) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'items es obligatorio.' }));
    }

    const doc = await saveCheckoutOrder({
      orderId,
      reference: orderId,
      gateway: String(body.gateway || 'wompi').toLowerCase(),
      status: 'pending',
      totalAmount,
      items,
      client: {
        fullName: String(clientIn.fullName || '').trim(),
        email: String(clientIn.email || '').trim(),
        phone: String(clientIn.phone || clientIn.cellphone || '').trim(),
        idNumber: cleanDoc(clientIn.idNumber || clientIn.document),
        idType: String(clientIn.idType || 'CC'),
      },
      shippingAddress: body.shippingAddress || null,
      createdAt: body.createdAt || new Date().toISOString(),
    });

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, orderId: doc.orderId }));
  } catch (err) {
    console.error('[register-checkout]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: err.message || 'error' }));
  }
}
