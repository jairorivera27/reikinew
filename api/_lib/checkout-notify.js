/**
 * Aviso al dueño cuando un checkout (carrito) queda pagado / aprobado.
 * Incluye ficha completa del formulario (celular destacado).
 */
import {
  getCheckoutOrder,
  patchCheckoutOrder,
  saveCheckoutOrder,
  cleanDoc,
} from './checkout-order-store.js';
import { notifyOwner, getWhatsAppConfig, formatPhoneCO, parsePhoneCo } from './whatsapp.js';

function formatCop(n) {
  const v = Math.round(Number(n) || 0);
  return v > 0 ? '$ ' + v.toLocaleString('es-CO') : '—';
}

function itemsSummary(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return '(sin detalle de productos)';
  return list
    .slice(0, 12)
    .map((it) => {
      const qty = it.quantity || 1;
      const name = it.name || it.title || it.sku || 'Producto';
      const price = it.unitPrice != null ? ` ${formatCop(it.unitPrice)}` : '';
      return `• ${qty}× ${name}${price}`;
    })
    .join('\n');
}

function formatPhoneDisplay(phone) {
  const dig = parsePhoneCo(phone) || String(phone || '').replace(/\D/g, '');
  if (!dig) return 'NO DEJÓ CELULAR';
  try {
    return formatPhoneCO(dig);
  } catch {
    return dig;
  }
}

export function formatCheckoutOwnerMessage(order, { unverified = false } = {}) {
  const gw = String(order.gateway || '').toUpperCase();
  const head = unverified
    ? `⏳ Cliente volvió de ${gw} (revisa estado en portal)\n`
    : `✅ PAGO CONFIRMADO ${gw}\n`;
  const addr = order.shippingAddress || {};
  const line = [addr.lineOne || addr.address, addr.city, addr.department]
    .filter(Boolean)
    .join(', ');
  const phoneLine = formatPhoneDisplay(order.client?.phone);

  return (
    head +
    `\n📱 CELULAR: ${phoneLine}\n` +
    `Cliente: ${order.client?.fullName || '—'}\n` +
    `Cédula: ${order.client?.idNumber || '—'}\n` +
    `Correo: ${order.client?.email || '—'}\n` +
    (line ? `Envío: ${line}\n` : '') +
    `Pedido: ${order.orderId || order.reference || '—'}\n` +
    `Total: ${formatCop(order.totalAmount)}\n` +
    `Productos:\n${itemsSummary(order.items)}\n` +
    (order.wompiTransactionId ? `Tx Wompi: ${order.wompiTransactionId}\n` : '') +
    (order.addiApplicationId ? `Addi app: ${order.addiApplicationId}\n` : '')
  ).trim();
}

async function notifyOrder(order, flagField = 'ownerNotified', opts = {}) {
  if (!order || order[flagField]) return false;
  const cfg = getWhatsAppConfig();
  const addr = order.shippingAddress || {};
  const phoneDisp = formatPhoneDisplay(order.client?.phone);
  let result = null;
  try {
    result = await notifyOwner(formatCheckoutOwnerMessage(order, opts), cfg, {
      titulo: opts.unverified
        ? `Addi pendiente - ${phoneDisp}`
        : `Pago ${String(order.gateway || '').toUpperCase()} ${formatCop(order.totalAmount)} - ${phoneDisp}`,
      nombre: order.client?.fullName || 'Cliente',
      ciudad: addr.city || phoneDisp,
    });
  } catch (err) {
    console.error('[checkout-notify] notifyOwner lanzó error', err?.message || err);
  }
  const delivered = Boolean(result?.ok && result?.method !== 'log');
  if (delivered) {
    await patchCheckoutOrder(order.orderId, { [flagField]: true });
  } else {
    console.error('[checkout-notify] AVISO NO ENTREGADO al WhatsApp del dueño', {
      orderId: order.orderId,
      results: result?.results,
    });
    await patchCheckoutOrder(order.orderId, {
      lastNotifyError: JSON.stringify(result?.results || []).slice(0, 500),
    });
  }
  return delivered;
}

function pickWompiCustomer(tx) {
  const cd = tx.customer_data || tx.customer || {};
  return {
    fullName: cd.full_name || cd.fullName || cd.name || '',
    email: cd.email || '',
    phone: cd.phone_number || cd.phone || cd.phoneNumber || '',
  };
}

function normalizeClient(client = {}) {
  return {
    fullName: String(client.fullName || client.nombre || '').trim(),
    email: String(client.email || client.correo || '')
      .trim()
      .toLowerCase(),
    phone: String(client.phone || client.cellphone || client.celular || '').trim(),
    idNumber: cleanDoc(client.idNumber || client.document),
    idType: String(client.idType || 'CC'),
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((it, idx) => ({
    sku: it.sku || it.id || `item-${idx}`,
    name: it.name || it.title || 'Producto',
    quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    unitPrice: Math.round(Number(it.unitPrice ?? it.price) || 0) || undefined,
  }));
}

function normalizeShipping(ship) {
  if (!ship || typeof ship !== 'object') return null;
  return {
    lineOne: String(ship.lineOne || ship.addressLine || ship.address || '').trim(),
    city: String(ship.city || '').trim(),
    department: String(ship.department || '').trim(),
  };
}

export async function upsertCheckoutSnapshot(input = {}) {
  const orderId = String(input.orderId || input.reference || '').trim();
  if (!orderId) throw new Error('orderId obligatorio');

  const clientIn = normalizeClient(input.client || {});
  const itemsIn = normalizeItems(input.items);
  const shipIn = normalizeShipping(input.shippingAddress);
  const prev = await getCheckoutOrder(orderId);

  if (!prev) {
    return saveCheckoutOrder({
      orderId,
      reference: orderId,
      gateway: String(input.gateway || 'wompi').toLowerCase(),
      status: String(input.status || 'pending').toLowerCase(),
      totalAmount: Math.round(Number(input.totalAmount) || 0),
      items: itemsIn,
      client: clientIn,
      shippingAddress: shipIn,
      wompiTransactionId: input.wompiTransactionId || null,
      addiApplicationId: input.addiApplicationId || null,
      paidAt: input.paidAt || null,
      createdAt: input.createdAt || new Date().toISOString(),
    });
  }

  const mergedClient = {
    fullName: clientIn.fullName || prev.client?.fullName || '',
    email: clientIn.email || prev.client?.email || '',
    phone: clientIn.phone || prev.client?.phone || '',
    idNumber: clientIn.idNumber || prev.client?.idNumber || '',
    idType: clientIn.idType || prev.client?.idType || 'CC',
  };

  return patchCheckoutOrder(orderId, {
    gateway: input.gateway || prev.gateway,
    status: input.status || prev.status,
    totalAmount: Math.round(Number(input.totalAmount) || 0) || prev.totalAmount,
    items: itemsIn.length ? itemsIn : prev.items,
    client: mergedClient,
    shippingAddress: shipIn?.lineOne || shipIn?.city ? shipIn : prev.shippingAddress,
    wompiTransactionId: input.wompiTransactionId || prev.wompiTransactionId,
    addiApplicationId: input.addiApplicationId || prev.addiApplicationId,
    paidAt: input.paidAt || prev.paidAt,
  });
}

export async function markCheckoutPaidFromWompi(tx, snapshot = {}) {
  const status = String(tx?.status || '').toUpperCase();
  if (status !== 'APPROVED') return { ok: false, reason: 'not_approved' };

  const reference = String(tx.reference || snapshot.orderId || snapshot.reference || '').trim();
  if (!reference) return { ok: false, reason: 'no_reference' };
  if (/^cot-/i.test(reference)) return { ok: false, reason: 'cotizacion_ref' };

  const fromTx = pickWompiCustomer(tx);
  const clientSnap = normalizeClient(snapshot.client || {});
  const order = await upsertCheckoutSnapshot({
    orderId: reference,
    gateway: 'wompi',
    status: 'approved',
    totalAmount:
      Math.round(Number(snapshot.totalAmount) || 0) ||
      Math.round(Number(tx.amount_in_cents ?? tx.amountInCents) / 100) ||
      0,
    items: snapshot.items,
    client: {
      fullName: clientSnap.fullName || fromTx.fullName,
      email: clientSnap.email || fromTx.email,
      phone: clientSnap.phone || fromTx.phone,
      idNumber: clientSnap.idNumber,
    },
    shippingAddress: snapshot.shippingAddress,
    wompiTransactionId: String(tx.id || '').trim() || null,
    paidAt: new Date().toISOString(),
  });

  const notified = await notifyOrder(order);
  return { ok: true, orderId: reference, notified, phone: order?.client?.phone || null };
}

const ADDI_OK = new Set(['APPROVED', 'COMPLETED']);

export async function markCheckoutPaidFromAddi(orderId, meta = {}) {
  const id = String(orderId || '').trim();
  const status = String(meta.status || '').toUpperCase();
  if (!id) return { ok: false, reason: 'no_order_id' };
  if (!ADDI_OK.has(status)) return { ok: false, reason: 'not_approved', status };

  const order = await upsertCheckoutSnapshot({
    orderId: id,
    gateway: 'addi',
    status: 'approved',
    totalAmount: meta.totalAmount,
    items: meta.items,
    client: meta.client,
    shippingAddress: meta.shippingAddress,
    addiApplicationId: meta.applicationId || null,
    paidAt: new Date().toISOString(),
  });

  const notified = await notifyOrder(order);
  return { ok: true, orderId: id, notified, phone: order?.client?.phone || null };
}

export async function notifyAddiReturnUnverified(orderId, snapshot = {}) {
  const id = String(orderId || '').trim();
  if (!id) return { ok: false, reason: 'no_order_id' };

  const order = await upsertCheckoutSnapshot({
    orderId: id,
    gateway: 'addi',
    status: snapshot.status || 'pending',
    totalAmount: snapshot.totalAmount,
    items: snapshot.items,
    client: snapshot.client,
    shippingAddress: snapshot.shippingAddress,
    addiApplicationId: snapshot.applicationId,
  });

  if (order.status === 'approved' || order.status === 'completed') {
    const notified = await notifyOrder(order);
    return { ok: true, orderId: id, notified, alreadyApproved: true, phone: order.client?.phone };
  }

  const notified = await notifyOrder(order, 'ownerNotifiedReturn', { unverified: true });
  return { ok: true, orderId: id, notified, unverified: true, phone: order.client?.phone };
}

/**
 * Cliente vuelve de Wompi con APPROVED en UI.
 * Si no hay WOMPI_PRIVATE_KEY en el servidor, igual avisamos con el formulario
 * (el pedido idealmente ya existe por /api/register-checkout).
 */
export async function notifyWompiReturnUnverified(snapshot = {}) {
  const orderId = String(snapshot.orderId || snapshot.reference || '').trim();
  if (!orderId) return { ok: false, reason: 'no_order_id' };

  const phone = String(snapshot.client?.phone || '').trim();
  const name = String(snapshot.client?.fullName || '').trim();
  if (!phone && !name) return { ok: false, reason: 'no_client' };

  const order = await upsertCheckoutSnapshot({
    orderId,
    gateway: 'wompi',
    status: 'pending_verify',
    totalAmount: snapshot.totalAmount,
    items: snapshot.items,
    client: snapshot.client,
    shippingAddress: snapshot.shippingAddress,
    wompiTransactionId: snapshot.wompiTransactionId || null,
  });

  if (order.ownerNotified) {
    return { ok: true, orderId, already: true, phone: order.client?.phone };
  }

  const notified = await notifyOrder(order, 'ownerNotifiedReturn', { unverified: true });
  return { ok: true, orderId, notified, unverified: true, phone: order.client?.phone };
}
