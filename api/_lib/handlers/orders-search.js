/**
 * GET /api/orders-search?nombre=&documento=&fecha=YYYY-MM-DD&dias=3
 * Header: Authorization: Bearer <ADMIN_ORDERS_SECRET>
 */
import { searchCheckoutOrders, listRecentCheckoutOrders } from '../checkout-order-store.js';

function authOk(req) {
  const secret = String(process.env.ADMIN_ORDERS_SECRET || '').trim();
  if (!secret) return false;
  const h = String(req.headers.authorization || req.headers.Authorization || '').trim();
  if (h.toLowerCase().startsWith('bearer ')) {
    return h.slice(7).trim() === secret;
  }
  const q = req.query?.key || req.url?.includes('key=');
  return false;
}

function parseQuery(req) {
  try {
    const u = new URL(req.url || '', 'http://localhost');
    return Object.fromEntries(u.searchParams.entries());
  } catch {
    return req.query || {};
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo GET.' }));
  }

  if (!authOk(req)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: 'No autorizado. Define ADMIN_ORDERS_SECRET.' }));
  }

  const q = parseQuery(req);
  const nombre = q.nombre || q.name || '';
  const documento = q.documento || q.doc || q.cedula || '';
  const fecha = q.fecha || q.date || '';
  const dias = q.dias || q.days || '3';

  const hasFilter = Boolean(String(nombre).trim() || String(documento).trim() || String(fecha).trim());
  const matches = hasFilter
    ? await searchCheckoutOrders({ nombre, documento, fecha, dias: Number(dias) || 3 })
    : await listRecentCheckoutOrders(Number(dias) || 3);

  res.statusCode = 200;
  return res.end(
    JSON.stringify({
      ok: true,
      count: matches.length,
      orders: matches,
    })
  );
}
