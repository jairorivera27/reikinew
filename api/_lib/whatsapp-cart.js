/**
 * Carrito WhatsApp por conversación (Redis TTL 7 días).
 * Precios siempre del catálogo al agregar.
 */
import { getRedis, waKey } from './whatsapp-redis.js';
import { getProductById, parsePriceCop, formatPriceCop } from './whatsapp-catalog.js';
import {
  sendText,
  sendButtons,
  sendList,
  sendImage,
  sendCtaUrl,
  notifyOwner,
  postLeadWebhook,
  isBsuid,
  parsePhoneCo,
  formatClientContact,
  getWhatsAppConfig,
} from './whatsapp.js';
import { ATTENTION_PHONE_DISPLAY, attentionWhatsAppUrl, sendEngineerHandoff } from './whatsapp-atencion.js';
import { getSession, saveSession } from './whatsapp-session.js';

const CART_TTL_SEC = 7 * 24 * 3600;
const HUMAN_MS =
  (Number(process.env.HUMAN_MODE_HOURS) > 0 ? Number(process.env.HUMAN_MODE_HOURS) : 12) * 60 * 60 * 1000;

const cartsMem = globalThis.__reikiWaCarts || new Map();
globalThis.__reikiWaCarts = cartsMem;

export async function getCart(from) {
  const id = String(from || '').trim();
  const empty = { items: [], updatedAt: Date.now() };
  if (!id) return empty;
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(waKey('cart', id));
      if (raw && typeof raw === 'object' && Array.isArray(raw.items)) {
        cartsMem.set(id, raw);
        return raw;
      }
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        if (parsed?.items) {
          cartsMem.set(id, parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[whatsapp-cart] get', err?.message || err);
    }
  }
  return cartsMem.get(id) || empty;
}

async function saveCart(from, cart) {
  const id = String(from || '').trim();
  const payload = { items: cart.items || [], updatedAt: Date.now(), pendingSlug: cart.pendingSlug || null };
  cartsMem.set(id, payload);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(waKey('cart', id), payload, { ex: CART_TTL_SEC });
    } catch (err) {
      console.warn('[whatsapp-cart] set', err?.message || err);
    }
  }
  return payload;
}

export function summarizeCart(cart) {
  const items = (cart?.items || []).map((it) => ({
    slug: it.slug,
    sku: it.sku,
    nombre: it.nombre,
    cantidad: it.cantidad,
    precio_unitario: it.precio,
    subtotal: formatPriceCop(it.precioNum * it.cantidad),
    url: it.url,
  }));
  const totalNum = (cart?.items || []).reduce((s, it) => s + it.precioNum * it.cantidad, 0);
  return { items, total: formatPriceCop(totalNum), totalNum, vacio: items.length === 0 };
}

export async function addToCart(from, productId, cantidad = 1) {
  const product = getProductById(productId);
  if (!product) return { ok: false, error: 'Producto no encontrado' };
  const qty = Math.max(1, Math.min(99, Number(cantidad) || 1));
  const precioNum = parsePriceCop(product.precio);
  if (!precioNum) return { ok: false, error: 'Sin precio publicado' };

  const cart = await getCart(from);
  const key = product.sku || product.slug;
  const existing = cart.items.find((it) => (it.sku || it.slug) === key);
  if (existing) {
    existing.cantidad = Math.min(99, existing.cantidad + qty);
    existing.precio = product.precio;
    existing.precioNum = precioNum;
  } else {
    cart.items.push({
      slug: product.slug,
      sku: product.sku || '',
      nombre: product.nombre,
      marca: product.marca || '',
      precio: product.precio,
      precioNum,
      cantidad: qty,
      imagen: product.imagen || '',
      url: product.url,
      categoria: product.categoria || '',
    });
  }
  cart.pendingSlug = null;
  await saveCart(from, cart);
  return { ok: true, cart: summarizeCart(cart), item: product };
}

export async function removeFromCart(from, productId) {
  const id = String(productId || '').trim().toLowerCase();
  const cart = await getCart(from);
  const before = cart.items.length;
  cart.items = cart.items.filter((it) => it.slug.toLowerCase() !== id && String(it.sku || '').toLowerCase() !== id);
  if (cart.items.length === before) return { ok: false, error: 'No estaba en la cotización' };
  await saveCart(from, cart);
  return { ok: true, cart: summarizeCart(cart) };
}

/** Pide cantidad por lista interactiva */
export async function askCartQuantity(from, slug, cfg = getWhatsAppConfig()) {
  const product = getProductById(slug);
  if (!product) {
    await sendText({ to: from, body: 'Producto no encontrado.', cfg });
    return;
  }
  const cart = await getCart(from);
  cart.pendingSlug = product.slug;
  await saveCart(from, cart);

  await sendList({
    to: from,
    body: `¿Cuántas unidades de *${product.nombre}* agregamos?\nPrecio unitario: ${product.precio}`,
    buttonText: 'Cantidad',
    sections: [
      {
        title: 'Cantidad',
        rows: [
          { id: `qty:${product.slug}:1`, title: '1 unidad', description: product.precio },
          { id: `qty:${product.slug}:2`, title: '2 unidades', description: '' },
          { id: `qty:${product.slug}:4`, title: '4 unidades', description: '' },
          { id: `qty:${product.slug}:6`, title: '6 unidades', description: '' },
          { id: `qty:${product.slug}:8`, title: '8 unidades', description: '' },
          { id: `qty:${product.slug}:10`, title: '10 unidades', description: '' },
          { id: `qty_other:${product.slug}`, title: 'Otra cantidad', description: 'Escribe el número' },
        ],
      },
    ],
    cfg,
  });
}

export async function sendCartSummary(from, cfg = getWhatsAppConfig()) {
  const cart = await getCart(from);
  const sum = summarizeCart(cart);
  if (sum.vacio) {
    await sendText({
      to: from,
      body: 'Tu cotización está vacía. Busca un equipo (ej. *panel 550W*) o escribe *menú*.',
      cfg,
    });
    return;
  }
  const lines = sum.items.map((it) => `• ${it.cantidad}× ${it.nombre} — ${it.subtotal}`).join('\n');
  await sendText({
    to: from,
    body: `*Tu cotización*\n${lines}\n\n*Total:* ${sum.total}\n_(precios con IVA incluido del catálogo)_`,
    cfg,
  });
  await sendButtons({
    to: from,
    body: '¿Seguimos?',
    buttons: [
      { id: 'cart_pdf', title: 'Generar PDF' },
      { id: 'cart_pay', title: 'Formas de pago' },
      { id: 'menu_asesor', title: 'Hablar ingeniero' },
    ],
    cfg,
  });
}

export function looksLikePaymentQuery(text) {
  const n = String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  return /\b(pago|pagar|wompi|addi|bre-?b|breb|transferencia|bancolombia|nequi|pse|comprobante)\b/.test(n);
}

export async function sendPaymentOptions(from, cfg = getWhatsAppConfig()) {
  const site = String(cfg.siteUrl || 'https://reikisolar.com.co').replace(/\/$/, '');
  const qrUrl = `${site}/cotizacion/qr-breb.png`;

  await sendText({
    to: from,
    body:
      '*Formas de pago*\n' +
      '• *Wompi / Addi:* compra en línea desde el link de la cotización o la tienda.\n' +
      '• *Transferencia Bancolombia:* ahorro N.º *36600008477*.\n' +
      '• *Bre-B:* llave *0089262235* (QR abajo).\n\n' +
      `Cuando pagues, envía el comprobante al *${ATTENTION_PHONE_DISPLAY}* (no a este chat).`,
    cfg,
  });

  try {
    await sendImage({
      to: from,
      link: qrUrl,
      caption: 'QR Bre-B · llave 0089262235',
      cfg,
    });
  } catch (err) {
    console.warn('[whatsapp-cart] QR Bre-B falló', err?.message || err);
    await sendText({ to: from, body: `QR Bre-B: ${qrUrl}\nLlave: 0089262235`, cfg });
  }

  try {
    await sendCtaUrl({
      to: from,
      body: 'Envía el comprobante al ingeniero / atención:',
      displayText: 'Enviar comprobante',
      url: attentionWhatsAppUrl('Hola, envío el comprobante de pago'),
      cfg,
    });
  } catch {
    await sendText({ to: from, body: attentionWhatsAppUrl('Hola, envío el comprobante de pago'), cfg });
  }
}

/** Stub PDF Fase 3: avisa + handoff 324 */
export async function stubGeneratePdf(from, cfg = getWhatsAppConfig()) {
  const cart = await getCart(from);
  const sum = summarizeCart(cart);
  if (sum.vacio) {
    await sendText({ to: from, body: 'Agrega al menos un equipo antes de generar el PDF.', cfg });
    return;
  }

  const s = await getSession(from);
  if (!String(s.data.nombre || '').trim()) {
    s.step = 'cart_nombre';
    await saveSession(from, s);
    await sendText({
      to: from,
      body: 'Para la cotización, ¿cuál es tu *nombre*?\n\n_Solo el nombre, ej. Alex_',
      cfg,
    });
    return;
  }
  if (!String(s.data.ciudad || '').trim()) {
    s.step = 'cart_ciudad';
    await saveSession(from, s);
    await sendText({ to: from, body: '¿En qué *ciudad* estás?', cfg });
    return;
  }
  if (isBsuid(from) && !parsePhoneCo(s.data.telefono)) {
    s.step = 'cart_celular';
    await saveSession(from, s);
    await sendText({
      to: from,
      body: 'WhatsApp oculta tu número. ¿Me das tu *celular*?\n\n_Ej. 300 123 4567_',
      cfg,
    });
    return;
  }

  await finalizePdfStub(from, cfg);
}

export async function finalizePdfStub(from, cfg = getWhatsAppConfig()) {
  const cart = await getCart(from);
  const sum = summarizeCart(cart);
  const s = await getSession(from);
  const nombre = String(s.data.nombre || '').trim();
  const ciudad = String(s.data.ciudad || '').trim();
  const telefono = parsePhoneCo(s.data.telefono || '');

  const itemsTxt = sum.items.map((it) => `• ${it.cantidad}× ${it.nombre}`).join('\n');
  await notifyOwner(
    `COTIZACIÓN PDF (stub)\n${formatClientContact(from, { telefono })}\nNombre: ${nombre}\nCiudad: ${ciudad}\nTotal: ${sum.total}\n${itemsTxt}\n→ PDF real en Fase 4`,
    cfg
  );
  await postLeadWebhook({
    tipo: 'cotizacion_pdf_stub',
    nombre,
    ciudad,
    celular: telefono || (isBsuid(from) ? 'número oculto' : from),
    identificador: from,
    total: sum.total,
    items: sum.items,
  });

  await sendText({
    to: from,
    body:
      `¡Listo, *${nombre.split(/\s+/)[0] || 'cliente'}*! 📄 Estoy preparando tu cotización (total orientativo ${sum.total}). ` +
      `Nuestro ingeniero experto en diseño fotovoltaico te la confirma desde el *${ATTENTION_PHONE_DISPLAY}*.`,
    cfg,
  });
  const { setAiPause } = await import('./whatsapp-ai.js');
  await setAiPause(from, HUMAN_MS);
  s.step = 'human';
  s.humanUntil = Date.now() + HUMAN_MS;
  await saveSession(from, s);
  await sendEngineerHandoff({ to: from, nombre, cfg });
}

/**
 * Maneja ids de carrito / qty / pagos. @returns {Promise<boolean>} true si consumió el mensaje
 */
export async function handleCartMessage(from, text, id, cfg) {
  const s = await getSession(from);

  if (s.step === 'cart_nombre' && text) {
    s.data.nombre = String(text).trim().slice(0, 80);
    s.step = 'cart_ciudad';
    await saveSession(from, s);
    await sendText({ to: from, body: '¿En qué *ciudad* estás?', cfg });
    return true;
  }
  if (s.step === 'cart_ciudad' && text) {
    s.data.ciudad = String(text).trim().slice(0, 80);
    if (isBsuid(from) && !parsePhoneCo(s.data.telefono)) {
      s.step = 'cart_celular';
      await saveSession(from, s);
      await sendText({ to: from, body: '¿Me das tu *celular*?\n\n_Ej. 300 123 4567_', cfg });
      return true;
    }
    s.step = 'idle';
    await saveSession(from, s);
    await finalizePdfStub(from, cfg);
    return true;
  }
  if (s.step === 'cart_celular' && text) {
    const tel = parsePhoneCo(text);
    if (!tel) {
      await sendText({ to: from, body: 'No reconocí el celular. Ejemplo: *300 123 4567*', cfg });
      return true;
    }
    s.data.telefono = tel;
    s.step = 'idle';
    await saveSession(from, s);
    await finalizePdfStub(from, cfg);
    return true;
  }

  if (s.step === 'cart_qty_other' && text) {
    const qty = Number(String(text).replace(/\D/g, ''));
    const slug = s.data.pendingQtySlug;
    if (!slug || !qty || qty < 1) {
      await sendText({ to: from, body: 'Escribe un número válido (ej. *3*).', cfg });
      return true;
    }
    s.step = 'idle';
    delete s.data.pendingQtySlug;
    await saveSession(from, s);
    const r = await addToCart(from, slug, qty);
    if (!r.ok) {
      await sendText({ to: from, body: r.error || 'No se pudo agregar.', cfg });
      return true;
    }
    await sendText({
      to: from,
      body: `Agregué *${qty}* a tu cotización. Total: *${r.cart.total}*`,
      cfg,
    });
    await sendButtons({
      to: from,
      body: '¿Algo más?',
      buttons: [
        { id: 'cart_view', title: 'Ver mi cotización' },
        { id: 'cart_other', title: 'Ver otra opción' },
        { id: 'cart_pdf', title: 'Generar PDF' },
      ],
      cfg,
    });
    return true;
  }

  if (id.startsWith('cart_add:')) {
    await askCartQuantity(from, id.slice('cart_add:'.length), cfg);
    return true;
  }
  if (id.startsWith('qty:')) {
    const parts = id.split(':');
    const slug = parts[1];
    const qty = Number(parts[2]) || 1;
    const r = await addToCart(from, slug, qty);
    if (!r.ok) {
      await sendText({ to: from, body: r.error || 'No se pudo agregar.', cfg });
      return true;
    }
    await sendText({
      to: from,
      body: `Listo ✅ Agregué *${qty}* × ${r.item.nombre}. Total cotización: *${r.cart.total}*`,
      cfg,
    });
    await sendButtons({
      to: from,
      body: '¿Seguimos?',
      buttons: [
        { id: 'cart_view', title: 'Ver mi cotización' },
        { id: 'cart_other', title: 'Buscar otro' },
        { id: 'cart_pdf', title: 'Generar PDF' },
      ],
      cfg,
    });
    return true;
  }
  if (id.startsWith('qty_other:')) {
    const slug = id.slice('qty_other:'.length);
    s.step = 'cart_qty_other';
    s.data.pendingQtySlug = slug;
    await saveSession(from, s);
    await sendText({ to: from, body: '¿Qué cantidad necesitas? Escribe solo el número (ej. *3*).', cfg });
    return true;
  }
  if (id === 'cart_view' || /^(ver mi cotizacion|mi cotizacion|ver carrito)\b/.test(String(text || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase())) {
    await sendCartSummary(from, cfg);
    return true;
  }
  if (id === 'cart_other') {
    await sendText({
      to: from,
      body: 'Dime qué otro equipo buscas (ej. *batería 48V*, *inversor 5kW*).',
      cfg,
    });
    return true;
  }
  if (id === 'cart_pdf' || /generar\s*pdf|cotizacion\s*pdf/.test(String(text || '').toLowerCase())) {
    await stubGeneratePdf(from, cfg);
    return true;
  }
  if (id === 'cart_pay' || looksLikePaymentQuery(text)) {
    await sendPaymentOptions(from, cfg);
    return true;
  }
  if (id.startsWith('prod:')) {
    const { sendProductDetail } = await import('./whatsapp-catalog.js');
    await sendProductDetail(from, id.slice(5), cfg);
    return true;
  }

  return false;
}
