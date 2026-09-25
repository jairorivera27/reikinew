/**
 * API pública de cotizaciones para el carrito web.
 *
 * GET  ?id=&t=  → carga ítems (precios congelados o catálogo si venció)
 * POST          → crea cotización origen web + PDF URL + avisa dueño
 * POST ?action=pagada  { id|reference, status } → marca pagada_online
 */
import {
  createCotizacion,
  getCotizacionIfToken,
  isCotizacionVencida,
  linkPaymentReference,
  loadEmpresa,
} from './_lib/cotizacion-store.js';
import { renderCotizacionPdfBuffer } from './_lib/cotizacion-pdf.js';
import { getProductById, formatPriceCop } from './_lib/whatsapp-catalog.js';
import { notifyOwner, getWhatsAppConfig } from './_lib/whatsapp.js';
import { formatPhoneCO as formatPhone } from './_lib/phone.js';

export const config = {
  maxDuration: 60,
  memory: 1769,
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body || '{}'));
      } catch {
        return resolve({});
      }
    }
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function toCartItem(it, { frozen = true } = {}) {
  let priceNum = Number(it.precio_unit || 0);
  let title = it.nombre;
  let image = it.imagen;
  let brand = it.marca;
  const id = it.id || it.sku || it.slug;
  if (!frozen) {
    const p = getProductById(it.sku || it.id || '');
    if (p) {
      priceNum = p.precioNum || priceNum;
      title = p.nombre || title;
      image = p.imagen || image;
      brand = p.marca || brand;
    }
  }
  const priceStr =
    typeof it.price === 'string' && it.price.includes('$')
      ? it.price
      : formatPriceCop(priceNum) || `$${Math.round(priceNum).toLocaleString('es-CO')}`;
  return {
    id: String(id || ''),
    title: String(title || 'Producto'),
    description: '',
    price: priceStr,
    image: String(image || ''),
    brand: String(brand || ''),
    model: '',
    quantity: Number(it.cantidad || it.quantity || 1) || 1,
    sku: String(it.sku || ''),
    frozenPrice: frozen,
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const q = new URL(req.url || '/', 'http://localhost').searchParams;
  const cfg = getWhatsAppConfig();
  const site = String(cfg.siteUrl || 'https://reikisolar.com.co').replace(/\/$/, '');

  try {
    if (req.method === 'GET') {
      const id = String(q.get('id') || '').trim();
      const token = String(q.get('t') || q.get('token') || '').trim();
      if (!id || !token) {
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: false, invalid: true }));
      }
      const doc = await getCotizacionIfToken(id, token);
      if (!doc) {
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: false, invalid: true }));
      }
      const vencida = isCotizacionVencida(doc);
      const items = (doc.items || []).map((it) => toCartItem(it, { frozen: !vencida }));
      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          ok: true,
          id: doc.id,
          numero: doc.numero,
          token: doc.token,
          vencida,
          aviso: vencida
            ? 'Esta cotización venció; los precios pueden haber cambiado'
            : null,
          link_compra: doc.link_compra,
          pdfUrl: doc.pdfUrl,
          total: doc.total,
          totalFmt: doc.totalFmt,
          cliente: doc.cliente,
          items,
        })
      );
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const action = String(q.get('action') || body.action || '').trim();

      if (action === 'pagada' || action === 'mark_paid') {
        // Ruta insegura eliminada: usar POST /api/wompi-confirm-pago con transactionId
        // o el webhook /api/wompi-events (firma + monto).
        res.statusCode = 410;
        return res.end(
          JSON.stringify({
            ok: false,
            error: 'deprecated',
            hint: 'Usa POST /api/wompi-confirm-pago { id: transactionId } o el webhook /api/wompi-events',
          })
        );
      }

      if (action === 'link_ref') {
        await linkPaymentReference(body.reference, body.id);
        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true }));
      }

      // Crear cotización web + PDF
      const itemsIn = Array.isArray(body.items) ? body.items : [];
      if (!itemsIn.length) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ ok: false, error: 'items_requeridos' }));
      }
      const nombre = String(body.nombre || body.cliente?.nombre || '').trim();
      const ciudad = String(body.ciudad || body.cliente?.ciudad || '').trim();
      const celular = formatPhone(body.celular || body.cliente?.celular || '');
      const correo = String(body.correo || body.cliente?.correo || '').trim();
      if (!nombre || !ciudad || !celular) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ ok: false, error: 'datos_cliente' }));
      }
      if (!body.autorizacion && !body.habeas) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ ok: false, error: 'autorizacion_requerida' }));
      }

      const items = itemsIn.map((it) => {
        const priceNum =
          Number(String(it.price || it.precio_unit || '').replace(/[^0-9]/g, '')) ||
          Number(it.precio_unit || 0);
        return {
          id: it.id || it.slug || it.sku,
          sku: it.sku || '',
          nombre: it.title || it.nombre || 'Producto',
          marca: it.brand || it.marca || '',
          cantidad: Number(it.quantity || it.cantidad || 1) || 1,
          precio_unit: priceNum,
          imagen: it.image || it.imagen || '',
          url: it.url || (it.id ? `${site}/tienda/${it.id}` : ''),
          specs: it.specs || [],
        };
      });

      const doc = await createCotizacion({
        origen: 'web',
        siteUrl: site,
        cliente: { nombre, ciudad, celular, correo },
        items,
        envio: null,
      });

      // Generar PDF (disponible en /cotizacion/{id}.pdf?t=)
      try {
        await renderCotizacionPdfBuffer(doc, { assetBase: site });
      } catch (err) {
        console.warn('[cotizacion-web] PDF warm', err?.message || err);
      }

      await notifyOwner(
        `📄 Cotización web PDF\nNombre: ${nombre}\nCiudad: ${ciudad}\nCelular: ${celular}\nN.º: ${doc.numero}\nTotal: ${doc.totalFmt}\nPDF: ${doc.pdfUrl}`,
        cfg
      );

      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          ok: true,
          id: doc.id,
          numero: doc.numero,
          token: doc.token,
          pdfUrl: doc.pdfUrl,
          link_compra: doc.link_compra,
          totalFmt: doc.totalFmt,
          empresa: loadEmpresa(),
        })
      );
    }

    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method' }));
  } catch (err) {
    console.error('[cotizacion-web]', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 300) }));
  }
}
