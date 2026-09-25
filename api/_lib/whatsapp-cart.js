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
  sendDocument,
  uploadWhatsAppMedia,
  notifyOwner,
  postLeadWebhook,
  isBsuid,
  parsePhoneCo,
  formatClientContact,
  getWhatsAppConfig,
} from './whatsapp.js';
import {
  ATTENTION_PHONE_DISPLAY,
  attentionWhatsAppUrl,
  ensureHabeasDataSent,
} from './whatsapp-atencion.js';
import { getSession, saveSession } from './whatsapp-session.js';
import { createCotizacion, getCotizacion, updateCotizacionEstado } from './cotizacion-store.js';
import { renderCotizacionPdfBuffer } from './cotizacion-pdf.js';
import { calcTotalesConIvaIncluido, formatCopPdf, formatCopCart, isExcluidoIva } from './iva.js';
import { looksLikePaymentIntent } from './whatsapp-intent.js';
import { formatPhoneCO } from './phone.js';

const HUMAN_MS =
  (Number(process.env.HUMAN_MODE_HOURS) > 0 ? Number(process.env.HUMAN_MODE_HOURS) : 12) * 60 * 60 * 1000;

const CART_TTL_SEC = 7 * 24 * 3600;

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
    categoria: it.categoria || '',
    excluidoIva: isExcluidoIva(it),
  }));
  const calc = calcTotalesConIvaIncluido(
    (cart?.items || []).map((it) => ({
      price: it.precioNum,
      quantity: it.cantidad,
      excluidoIva: it.excluidoIva,
      categoria: it.categoria,
      nombre: it.nombre,
    }))
  );
  return {
    items,
    total: formatPriceCop(calc.total),
    totalNum: calc.total,
    totalPdf: formatCopPdf(calc.total),
    excluido: calc.excluido,
    excluidoFmt: formatCopCart(calc.excluido),
    iva: calc.iva,
    ivaFmt: formatCopCart(calc.iva),
    baseGravada: calc.baseGravada,
    baseFmt: formatCopCart(calc.baseGravada),
    vacio: items.length === 0,
  };
}

function extractPotenciaW(nombre) {
  const s = String(nombre || '');
  // Paneles: 550W / 625 W (no kW)
  const m = s.match(/(\d{3,4})\s*w\b/i);
  if (m && !/k\s*w/i.test(s.slice(Math.max(0, m.index - 1), m.index + m[0].length))) {
    return Number(m[1]);
  }
  return undefined;
}

function cartItemsForQuote(cart) {
  return (cart?.items || []).map((it) => {
    const product = getProductById(it.slug || it.sku);
    const potencia = it.potencia_w || extractPotenciaW(it.nombre) || extractPotenciaW(product?.nombre);
    let imagen = it.imagen || product?.imagen || '';
    if (imagen && !/^https?:\/\//i.test(imagen)) {
      imagen = product?.imagen || imagen;
    }
    return {
      id: it.slug,
      sku: it.sku,
      nombre: it.nombre,
      marca: it.marca || product?.marca || '',
      cantidad: it.cantidad,
      precio_unit: it.precioNum,
      imagen,
      url: it.url || product?.url || '',
      specs: (product?.specs || it.specs || []).slice(0, 6),
      potencia_w: potencia,
    };
  });
}

/** Generar PDF real: pide nombre/ciudad/(celular BSUID), habeas si falta, envía documento WA. */
export async function stubGeneratePdf(from, cfg = getWhatsAppConfig()) {
  const cart = await getCart(from);
  const sum = summarizeCart(cart);
  if (sum.vacio) {
    await sendText({ to: from, body: 'Agrega al menos un equipo antes de generar el PDF.', cfg });
    return;
  }

  await ensureHabeasDataSent(from, cfg);

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
  if (sum.vacio) {
    await sendText({ to: from, body: 'Agrega al menos un equipo antes de generar el PDF.', cfg });
    return;
  }

  const s = await getSession(from);
  const nombre = String(s.data.nombre || '').trim();
  const ciudad = String(s.data.ciudad || '').trim();
  const telefono = parsePhoneCo(s.data.telefono || '') || (!isBsuid(from) ? String(from).replace(/\D/g, '') : '');
  const celularDisplay = telefono
    ? formatPhoneCO(telefono)
    : isBsuid(from)
      ? 'Número oculto (WhatsApp)'
      : formatPhoneCO(from) || String(from);

  await sendText({
    to: from,
    body: `Perfecto, *${nombre.split(/\s+/)[0] || 'cliente'}*. Estoy generando tu cotización en PDF…`,
    cfg,
  });

  let doc;
  try {
    doc = await createCotizacion({
      origen: 'whatsapp',
      siteUrl: cfg.siteUrl,
      cliente: {
        nombre,
        ciudad,
        celular: celularDisplay,
        whatsappId: from,
      },
      items: cartItemsForQuote(cart),
      envio: null,
    });

    const pdfBuf = await renderCotizacionPdfBuffer(doc, { assetBase: cfg.siteUrl });
    const filename = `Cotizacion-Reiki-${doc.numero}.pdf`;
    const mediaId = await uploadWhatsAppMedia(pdfBuf, filename, cfg);
    await sendDocument({
      to: from,
      mediaId,
      filename,
      caption: `Cotización ${doc.numero} · Total ${doc.totalFmt}`,
      cfg,
    });

    await sendText({
      to: from,
      body:
        `Listo ✅ Aquí tienes tu cotización *${doc.numero}* (válida ${doc.validez}).\n\n` +
        `Si quieres, ¿te gustaría avanzar con la compra? Puedo enviarte las formas de pago o el link para pagar en línea. Sin compromiso.`,
      cfg,
    });

    await notifyOwner(
      `📄 Cotización PDF generada\n` +
        `Nombre: ${nombre}\n` +
        `Ciudad: ${ciudad}\n` +
        `N.º: ${doc.numero}\n` +
        `Excluido IVA: ${formatCopPdf(doc.subtotal_excluido || 0)}\n` +
        `Base gravada: ${formatCopPdf(doc.subtotal_base || 0)}\n` +
        `IVA 19%: ${formatCopPdf(doc.iva || 0)}\n` +
        `Total: ${doc.totalFmt}\n` +
        `PDF: ${doc.pdfUrl}\n` +
        `${formatClientContact(from, { telefono })}`,
      cfg
    );

    await postLeadWebhook({
      tipo: 'cotizacion_pdf',
      nombre,
      ciudad,
      celular: celularDisplay,
      identificador: from,
      numero: doc.numero,
      total: doc.totalFmt,
      totalNum: doc.total,
      pdfUrl: doc.pdfUrl,
      items: sum.items,
    });

    s.step = 'idle';
    s.data.lastCotizacionId = doc.id;
    s.data.lastCotizacionNumero = doc.numero;
    await saveSession(from, s);
  } catch (err) {
    console.error('[whatsapp-cart] PDF falló', err?.message || err);
    await sendText({
      to: from,
      body:
        `No pude generar el PDF en este momento. Un asesor te escribe al *${ATTENTION_PHONE_DISPLAY}* para enviártela.\n` +
        `(Total orientativo: ${sum.total})`,
      cfg,
    });
    await notifyOwner(
      `⚠️ Falló PDF cotización\n${formatClientContact(from, { telefono })}\nNombre: ${nombre}\nCiudad: ${ciudad}\nTotal: ${sum.total}\nError: ${String(err?.message || err).slice(0, 200)}`,
      cfg
    );
  }
}

/** Sugerencia de complemento según categoría (una a la vez). */
function complementHint(product) {
  const cat = String(product?.categoria || product?.category || '').toLowerCase();
  const name = String(product?.nombre || '').toLowerCase();
  if (cat.includes('inversor') || /\binversor/.test(name)) {
    return {
      query: 'bateria litio 48v',
      msg:
        '¡Excelente elección! 👌 Por lo general, con este inversor también se necesitan baterías y protecciones. ¿Te gustaría que te muestre algunas opciones, por favor?',
    };
  }
  if (cat.includes('panel') || (/\bpanel/.test(name) && !/protector|cable|estructura/.test(name))) {
    return {
      query: 'inversor',
      msg:
        '¡Excelente elección! 👌 Con paneles suele hacer falta un inversor, estructura y cable solar. ¿Te gustaría que te muestre algunas opciones, por favor?',
    };
  }
  if (cat.includes('bateria') || /\bbateria|batería|litio/.test(name)) {
    return {
      query: 'inversor',
      msg:
        '¡Excelente elección! 👌 Con baterías suele usarse un inversor compatible y protecciones. ¿Te gustaría que te muestre algunas opciones, por favor?',
    };
  }
  if (cat.includes('controlador') || /\bcontrolador|mppt|pwm/.test(name)) {
    return {
      query: 'panel solar',
      msg:
        '¡Excelente elección! 👌 Con un controlador suelen ir paneles y baterías. ¿Te gustaría que te muestre algunas opciones, por favor?',
    };
  }
  return null;
}

async function offerComplementAfterAdd(from, product, cfg) {
  const hint = complementHint(product);
  if (!hint) {
    await sendButtons({
      to: from,
      body: '¿Deseas agregar algún otro equipo o prefieres que te genere la cotización en PDF?',
      buttons: [
        { id: 'cart_other', title: 'Agregar otro' },
        { id: 'cart_pdf', title: 'Generar PDF' },
        { id: 'cart_view', title: 'Ver cotización' },
      ],
      cfg,
    });
    return;
  }
  const s = await getSession(from);
  s.data.pendingCompQuery = hint.query;
  await saveSession(from, s);
  await sendButtons({
    to: from,
    body: hint.msg,
    buttons: [
      { id: 'comp_si', title: 'Sí, muéstrame' },
      { id: 'comp_no', title: 'No, gracias' },
    ],
    cfg,
  });
}

export async function handleComplementReply(from, id, cfg = getWhatsAppConfig()) {
  if (id !== 'comp_si' && id !== 'comp_no') return false;
  const s = await getSession(from);
  const q = s.data.pendingCompQuery;
  delete s.data.pendingCompQuery;
  await saveSession(from, s);
  if (id === 'comp_si' && q) {
    const { sendProductSearchList } = await import('./whatsapp-catalog.js');
    await sendProductSearchList(from, q, cfg);
    return true;
  }
  await sendButtons({
    to: from,
    body: 'Con mucho gusto. ¿Deseas agregar algún otro equipo o prefieres que te genere la cotización en PDF?',
    buttons: [
      { id: 'cart_other', title: 'Agregar otro' },
      { id: 'cart_pdf', title: 'Generar PDF' },
      { id: 'cart_view', title: 'Ver cotización' },
    ],
    cfg,
  });
  return true;
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
    const categoria = product.categoria || '';
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
      categoria,
      excluidoIva: isExcluidoIva({ categoria, nombre: product.nombre }),
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
  const lines = sum.items
    .map(
      (it) =>
        `• ${it.cantidad}× ${it.nombre} — ${it.subtotal}${it.excluidoIva ? ' _(excluido IVA)_' : ''}`
    )
    .join('\n');
  await sendText({
    to: from,
    body:
      `*Tu cotización*\n${lines}\n\n` +
      `Subtotal excluido de IVA: *${sum.excluidoFmt}*\n` +
      `Subtotal gravado (base): *${sum.baseFmt}*\n` +
      `IVA 19 %: *${sum.ivaFmt}*\n` +
      `*Total:* ${sum.total}\n\n` +
      `_Paneles e inversores excluidos de IVA (Ley 1715). Los demás incluyen IVA del 19 %._`,
    cfg,
  });
  await sendButtons({
    to: from,
    body: '¿Deseas agregar algún otro equipo o prefieres que te genere la cotización en PDF?',
    buttons: [
      { id: 'cart_other', title: 'Agregar otro' },
      { id: 'cart_pdf', title: 'Generar PDF' },
      { id: 'cart_pay', title: 'Formas de pago' },
    ],
    cfg,
  });
}

/** @deprecated Prefer looksLikePaymentIntent from whatsapp-intent.js */
export function looksLikePaymentQuery(text, opts = {}) {
  return looksLikePaymentIntent(text, opts);
}

export async function hasActiveCartOrQuote(from) {
  const cart = await getCart(from);
  if ((cart?.items || []).length > 0) return true;
  try {
    const s = await getSession(from);
    if (s?.data?.lastCotizacionId || s?.data?.lastCotizacionNumero) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export async function sendAmbiguousPayOrAhorro(from, cfg = getWhatsAppConfig()) {
  await sendButtons({
    to: from,
    body: '¿Te refieres a *ahorrar en tu factura de la luz* o a *pagar un pedido* con nosotros?',
    buttons: [
      { id: 'obj_ahorro', title: 'Ahorrar en factura' },
      { id: 'cart_pay', title: 'Pagar mi pedido' },
    ],
    cfg,
  });
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

/**
 * Maneja ids de carrito / qty / pagos. @returns {Promise<boolean>} true si consumió el mensaje
 */
export async function handleCartMessage(from, text, id, cfg) {
  const s = await getSession(from);

  if (id === 'comp_si' || id === 'comp_no') {
    return handleComplementReply(from, id, cfg);
  }

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
      body: `Con mucho gusto ✅ Agregué *${qty}* a tu cotización. Total: *${r.cart.total}*`,
      cfg,
    });
    await offerComplementAfterAdd(from, r.item, cfg);
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
      body: `Con mucho gusto ✅ Agregué *${qty}* × ${r.item.nombre}. Total cotización: *${r.cart.total}*`,
      cfg,
    });
    await offerComplementAfterAdd(from, r.item, cfg);
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
      body:
        'Con mucho gusto. Por favor dime qué otro equipo buscas (ej. *batería 48V*, *inversor 5kW*).',
      cfg,
    });
    return true;
  }
  if (id === 'cart_pdf' || /generar\s*pdf|cotizacion\s*pdf/.test(String(text || '').toLowerCase())) {
    await stubGeneratePdf(from, cfg);
    return true;
  }
  // Solo botón cart_pay aquí; el texto libre de pagos lo resuelve el bot (después de ahorro).
  if (id === 'cart_pay') {
    await sendPaymentOptions(from, cfg);
    return true;
  }
  if (id === 'cart_buy' || id === 'quiere_comprar') {
    await startPurchaseClose(from, cfg);
    return true;
  }
  if (id.startsWith('prod:')) {
    const { sendProductDetail } = await import('./whatsapp-catalog.js');
    await sendProductDetail(from, id.slice(5), cfg);
    return true;
  }

  return false;
}

/**
 * Cierre de compra (punto 19): quiere_comprar + link + Bre-B + aviso dueño + modo humano.
 */
export async function startPurchaseClose(from, cfg = getWhatsAppConfig()) {
  const cart = await getCart(from);
  const sum = summarizeCart(cart);
  const s = await getSession(from);
  const site = String(cfg.siteUrl || 'https://reikisolar.com.co').replace(/\/$/, '');
  const qrUrl = `${site}/cotizacion/qr-breb.png`;

  let doc = null;
  const lastId = s.data?.lastCotizacionId;
  if (lastId) {
    doc = await getCotizacion(lastId);
  }

  if (!doc && !sum.vacio) {
    const nombre = String(s.data.nombre || 'Cliente').trim();
    const ciudad = String(s.data.ciudad || '').trim();
    const telefono =
      parsePhoneCo(s.data.telefono || '') || (!isBsuid(from) ? String(from).replace(/\D/g, '') : '');
    doc = await createCotizacion({
      origen: 'whatsapp',
      siteUrl: cfg.siteUrl,
      cliente: {
        nombre,
        ciudad: ciudad || 'Colombia',
        celular: telefono ? formatPhoneCO(telefono) : isBsuid(from) ? 'Número oculto (WhatsApp)' : formatPhoneCO(from),
        whatsappId: from,
      },
      items: cartItemsForQuote(cart),
      envio: null,
    });
    s.data.lastCotizacionId = doc.id;
    s.data.lastCotizacionNumero = doc.numero;
    await saveSession(from, s);
  }

  if (!doc) {
    await sendText({
      to: from,
      body:
        'Aún no tienes una cotización activa. Busca un equipo (ej. *panel 550W* o *inversor 5kW*) y agrégalo; luego te ayudo a comprar.',
      cfg,
    });
    return { ok: false, empty: true };
  }

  await updateCotizacionEstado(doc.id, 'quiere_comprar');

  const numero = doc.numero;
  const buyUrl = doc.link_compra || `${site}/carrito?cot=${doc.id}&t=${doc.token}`;
  const pdfUrl = doc.pdfUrl || `${site}/cotizacion/${doc.id}.pdf?t=${doc.token}`;
  const itemsTxt = (doc.items || [])
    .map((it) => `• ${it.cantidad}× ${it.nombre}`)
    .join('\n');

  await sendText({
    to: from,
    body:
      `¡Genial! Avancemos con la compra de *${numero}* (total ${doc.totalFmt}).\n\n` +
      `*1) Pago en línea (Wompi / Addi):*\n${buyUrl}\n\n` +
      `*2) Transferencia Bancolombia:* ahorros *36600008477*\n` +
      `*3) Bre-B:* llave *0089262235* (QR abajo)\n\n` +
      `Cuando pagues, envía el comprobante con el n.º *${numero}* al WhatsApp *${ATTENTION_PHONE_DISPLAY}* 👇`,
    cfg,
  });

  try {
    await sendImage({
      to: from,
      link: qrUrl,
      caption: `QR Bre-B · llave 0089262235 · cotización ${numero}`,
      cfg,
    });
  } catch (err) {
    console.warn('[whatsapp-cart] QR compra', err?.message || err);
  }

  try {
    await sendCtaUrl({
      to: from,
      body: `Enviar comprobante de la cotización ${numero}:`,
      displayText: 'Enviar comprobante',
      url: attentionWhatsAppUrl(
        `Hola, envío el comprobante de la cotización ${numero}`
      ),
      cfg,
    });
  } catch {
    await sendText({
      to: from,
      body: attentionWhatsAppUrl(`Hola, envío el comprobante de la cotización ${numero}`),
      cfg,
    });
  }

  const nombre = String(doc.cliente?.nombre || s.data.nombre || '').trim();
  const ciudad = String(doc.cliente?.ciudad || s.data.ciudad || '').trim();
  const celular = formatPhoneCO(doc.cliente?.celular || s.data.telefono || from) || doc.cliente?.celular;

  await notifyOwner(
    `🛒 Cliente quiere comprar\n` +
      `Nombre: ${nombre}\n` +
      `Ciudad: ${ciudad}\n` +
      `Celular: ${celular}\n` +
      `N.º: ${numero}\n` +
      `Excluido IVA: ${formatCopPdf(doc.subtotal_excluido || 0)}\n` +
      `Base gravada: ${formatCopPdf(doc.subtotal_base || 0)}\n` +
      `IVA 19%: ${formatCopPdf(doc.iva || 0)}\n` +
      `Total: ${doc.totalFmt}\n` +
      `${itemsTxt}\n` +
      `PDF: ${pdfUrl}\n` +
      `${formatClientContact(from, { telefono: s.data.telefono })}`,
    cfg
  );

  // Intentar PDF al dueño si hay ventana 24h
  try {
    const pdfBuf = await renderCotizacionPdfBuffer(doc, { assetBase: cfg.siteUrl });
    const filename = `Cotizacion-Reiki-${numero}.pdf`;
    const mediaId = await uploadWhatsAppMedia(pdfBuf, filename, cfg);
    const owner = cfg.personalPhone || cfg.ownerPhone;
    if (owner) {
      await sendDocument({
        to: owner,
        mediaId,
        filename,
        caption: `🛒 Quiere comprar ${numero} · ${doc.totalFmt}`,
        cfg,
      });
    }
  } catch (err) {
    console.warn('[whatsapp-cart] PDF al dueño (normal si sin ventana 24h)', err?.message || err);
  }

  await postLeadWebhook({
    tipo: 'quiere_comprar',
    nombre,
    ciudad,
    celular,
    identificador: from,
    numero,
    total: doc.totalFmt,
    pdfUrl,
    items: doc.items,
  });

  const { setAiPause } = await import('./whatsapp-ai.js');
  await setAiPause(from, HUMAN_MS);
  s.step = 'human';
  s.humanUntil = Date.now() + HUMAN_MS;
  await saveSession(from, s);

  return { ok: true, doc };
}
