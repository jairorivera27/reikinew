/**
 * Router único para endpoints de pedidos del carrito (plan Hobby de Vercel: máx. 12 funciones).
 * URLs públicas (vercel.json rewrites):
 *   POST /api/register-checkout   → ?accion=register
 *   GET  /api/orders-search        → ?accion=search
 *   POST /api/addi-confirm-order   → ?accion=addi-confirm
 */
import registerCheckout from './_lib/handlers/register-checkout.js';
import ordersSearch from './_lib/handlers/orders-search.js';
import addiConfirmOrder from './_lib/handlers/addi-confirm-order.js';

const HANDLERS = {
  register: registerCheckout,
  search: ordersSearch,
  'addi-confirm': addiConfirmOrder,
};

export default async function handler(req, res) {
  let accion = '';
  try {
    accion = new URL(req.url || '/', 'http://localhost').searchParams.get('accion') || '';
  } catch {
    /* ignore */
  }
  if (!accion && req.query) accion = String(req.query.accion || '');
  const fn = HANDLERS[accion];
  if (!fn) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'accion_desconocida' }));
  }
  return fn(req, res);
}
