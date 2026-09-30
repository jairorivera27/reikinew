/**
 * GET /api/orders-search?nombre=&documento=&fecha=YYYY-MM-DD&dias=3
 * Header: Authorization: Bearer <ADMIN_ORDERS_SECRET>
 */
import { adminAuthOk } from '../admin-auth.js';
import { searchCheckoutOrders, listRecentCheckoutOrders } from '../checkout-order-store.js';

function parseQuery(req) {
  try {
    const u = new URL(req.url || '', 'http://localhost');
    return Object.fromEntries(u.searchParams.entries());
  } catch {
    return req.query || {};
  }
}

function normalizeOrder(o) {
  if (!o || typeof o !== 'object') return o;
  return {
    ...o,
    workflowStatus: String(o.workflowStatus || 'nuevo').toLowerCase(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo GET.' }));
  }

  if (!adminAuthOk(req)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: 'No autorizado. Define ADMIN_ORDERS_SECRET.' }));
  }

  const q = parseQuery(req);
  const nombre = q.nombre || q.name || '';
  const documento = q.documento || q.doc || q.cedula || '';
  const fecha = q.fecha || q.date || '';
  const dias = q.dias || q.days || '7';

  const hasFilter = Boolean(String(nombre).trim() || String(documento).trim() || String(fecha).trim());
  const matches = hasFilter
    ? await searchCheckoutOrders({ nombre, documento, fecha, dias: Number(dias) || 7 })
    : await listRecentCheckoutOrders(Number(dias) || 7);

  const orders = matches.map(normalizeOrder);

  res.statusCode = 200;
  return res.end(
    JSON.stringify({
      ok: true,
      count: orders.length,
      orders,
    })
  );
}
