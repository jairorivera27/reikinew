import { adminAuthOk } from '../admin-auth.js';
import { getCheckoutOrder, patchCheckoutOrder } from '../checkout-order-store.js';
import { createCotizacion, getCotizacion } from '../cotizacion-store.js';

function parseQuery(req) {
  try {
    return Object.fromEntries(new URL(req.url || '', 'http://localhost').searchParams.entries());
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
  if (!adminAuthOk(req)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: 'No autorizado.' }));
  }

  const q = parseQuery(req);
  const orderId = String(q.orderId || q.id || '').trim();
  if (!orderId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'orderId obligatorio.' }));
  }

  try {
    const order = await getCheckoutOrder(orderId);
    if (!order) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ ok: false, error: 'Pedido no encontrado.' }));
    }

    if (order.cotizacionId && order.cotizacionToken) {
      const existing = await getCotizacion(order.cotizacionId);
      if (existing && existing.token === order.cotizacionToken) {
        return res.end(
          JSON.stringify({
            ok: true,
            orderId,
            pdfUrl: existing.pdfUrl,
            numero: existing.numero,
            reused: true,
          })
        );
      }
    }

    const site = String(
      process.env.WHATSAPP_SITE_URL || process.env.ADDI_SITE_URL || 'https://reikisolar.com.co'
    ).replace(/\/$/, '');

    const items = (Array.isArray(order.items) ? order.items : []).map((it) => ({
      sku: it.sku || it.id || '',
      nombre: it.name || it.title || 'Producto',
      cantidad: Number(it.quantity || 1) || 1,
      precio_unit: Math.round(Number(it.unitPrice ?? it.price) || 0),
      categoria: it.category || '',
    }));

    if (!items.length) {
      res.statusCode = 422;
      return res.end(JSON.stringify({ ok: false, error: 'El pedido no tiene productos.' }));
    }

    const doc = await createCotizacion({
      origen: 'tienda_pedido',
      siteUrl: site,
      cliente: {
        nombre: order.client?.fullName || '',
        ciudad: order.shippingAddress?.city || '',
        celular: order.client?.phone || '',
        correo: order.client?.email || '',
      },
      items,
      envio: null,
    });

    await patchCheckoutOrder(orderId, {
      cotizacionId: doc.id,
      cotizacionToken: doc.token,
      cotizacionNumero: doc.numero,
      cotizacionPdfUrl: doc.pdfUrl,
    });

    res.statusCode = 200;
    return res.end(
      JSON.stringify({
        ok: true,
        orderId,
        pdfUrl: doc.pdfUrl,
        numero: doc.numero,
        reused: false,
      })
    );
  } catch (err) {
    console.error('[order-pdf]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 300) }));
  }
}
