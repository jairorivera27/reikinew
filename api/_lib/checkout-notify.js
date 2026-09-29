/**
 * Aviso al dueño cuando un checkout (carrito) queda pagado / aprobado.
 */
import { getCheckoutOrder, patchCheckoutOrder, saveCheckoutOrder } from './checkout-order-store.js';
import { notifyOwner, getWhatsAppConfig } from './whatsapp.js';

function formatCop(n) {
  const v = Math.round(Number(n) || 0);
  return v > 0 ? '$ ' + v.toLocaleString('es-CO') : '—';
}

function itemsSummary(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return '—';
  return list
    .slice(0, 8)
    .map((it) => {
      const qty = it.quantity || 1;
      const name = it.name || it.title || it.sku || 'Producto';
      return `${qty}× ${name}`;
    })
    .join('; ');
}

export function formatCheckoutOwnerMessage(order, { unverified = false } = {}) {
  const gw = String(order.gateway || '').toUpperCase();
  const head = unverified
    ? `⏳ Cliente regresó de ${gw} diciendo "aprobado" (AÚN SIN CONFIRMAR por ${gw})\n` +
      `No despaches hasta verlo aprobado en el panel de ${gw === 'ADDI' ? 'aliados.addi.com' : gw}.\n`
    : `✅ PAGO CONFIRMADO ${gw}\n`;
  const addr = order.shippingAddress || {};
  const line = [addr.lineOne || addr.address, addr.city].filter(Boolean).join(', ');
  return (
    head +
    `Pedido: ${order.orderId || order.reference || '—'}\n` +
    `Total: ${formatCop(order.totalAmount)}\n` +
    `Cliente: ${order.client?.fullName || '—'}\n` +
    `Cédula: ${order.client?.idNumber || '—'}\n` +
    `Celular: ${order.client?.phone || '—'}\n` +
    `Correo: ${order.client?.email || '—'}\n` +
    (line ? `Envío: ${line}\n` : '') +
    `Productos: ${itemsSummary(order.items)}\n` +
    (order.wompiTransactionId ? `Tx Wompi: ${order.wompiTransactionId}\n` : '') +
    (order.addiApplicationId ? `Addi app: ${order.addiApplicationId}\n` : '')
  ).trim();
}

/**
 * Envía el aviso y SOLO marca ownerNotified si WhatsApp lo aceptó
 * (antes se marcaba aunque fallara y el aviso se perdía para siempre).
 */
async function notifyOrder(order, flagField = 'ownerNotified', opts = {}) {
  if (!order || order[flagField]) return false;
  const cfg = getWhatsAppConfig();
  const addr = order.shippingAddress || {};
  let result = null;
  try {
    result = await notifyOwner(formatCheckoutOwnerMessage(order, opts), cfg, {
      titulo: opts.unverified
        ? `Addi sin confirmar - pedido ${order.orderId}`
        : `Pago confirmado ${String(order.gateway || '').toUpperCase()} - ${formatCop(order.totalAmount)}`,
      nombre: order.client?.fullName || 'Cliente',
      ciudad: addr.city || '—',
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
    await patchCheckoutOrder(order.orderId, { lastNotifyError: JSON.stringify(result?.results || []).slice(0, 500) });
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

/**
 * @param {object} tx transacción Wompi
 */
export async function markCheckoutPaidFromWompi(tx) {
  const status = String(tx?.status || '').toUpperCase();
  if (status !== 'APPROVED') return { ok: false, reason: 'not_approved' };

  const reference = String(tx.reference || '').trim();
  if (!reference) return { ok: false, reason: 'no_reference' };
  if (/^cot-/i.test(reference)) return { ok: false, reason: 'cotizacion_ref' };

  let order = await getCheckoutOrder(reference);
  if (!order) {
    const fromTx = pickWompiCustomer(tx);
    order = await saveCheckoutOrder({
      orderId: reference,
      reference,
      gateway: 'wompi',
      status: 'approved',
      totalAmount: Math.round(Number(tx.amount_in_cents ?? tx.amountInCents) / 100) || 0,
      items: [],
      client: {
        fullName: fromTx.fullName,
        email: fromTx.email,
        phone: fromTx.phone,
      },
      wompiTransactionId: String(tx.id || '').trim() || null,
      paidAt: new Date().toISOString(),
    });
  } else {
    const fromTx = pickWompiCustomer(tx);
    order = await patchCheckoutOrder(reference, {
      status: 'approved',
      paidAt: order.paidAt || new Date().toISOString(),
      wompiTransactionId: String(tx.id || '').trim() || order.wompiTransactionId,
      totalAmount:
        order.totalAmount ||
        Math.round(Number(tx.amount_in_cents ?? tx.amountInCents) / 100) ||
        0,
      client: {
        fullName: order.client?.fullName || fromTx.fullName,
        email: order.client?.email || fromTx.email,
        phone: order.client?.phone || fromTx.phone,
      },
    });
  }

  const notified = await notifyOrder(order);
  return { ok: true, orderId: reference, notified };
}

const ADDI_OK = new Set(['APPROVED', 'COMPLETED']);

/**
 * @param {string} orderId
 * @param {{ status?: string, applicationId?: string }} meta
 */
export async function markCheckoutPaidFromAddi(orderId, meta = {}) {
  const id = String(orderId || '').trim();
  const status = String(meta.status || '').toUpperCase();
  if (!id) return { ok: false, reason: 'no_order_id' };
  if (!ADDI_OK.has(status)) return { ok: false, reason: 'not_approved', status };

  let order = await getCheckoutOrder(id);
  if (!order) {
    order = await saveCheckoutOrder({
      orderId: id,
      reference: id,
      gateway: 'addi',
      status: 'approved',
      totalAmount: 0,
      items: [],
      client: {},
      addiApplicationId: meta.applicationId || null,
      paidAt: new Date().toISOString(),
    });
  } else {
    order = await patchCheckoutOrder(id, {
      status: 'approved',
      paidAt: order.paidAt || new Date().toISOString(),
      addiApplicationId: meta.applicationId || order.addiApplicationId,
    });
  }

  const notified = await notifyOrder(order);
  return { ok: true, orderId: id, notified };
}

/**
 * El navegador del cliente dice que Addi aprobó (parámetro ?status= de la URL).
 * Eso lo puede falsificar cualquiera, así que NO marca el pedido como pagado:
 * solo avisa "sin confirmar" (una vez) si el pedido existe y fue creado por addi-checkout.
 * La confirmación real llega por /api/addi-webhook.
 */
export async function notifyAddiReturnUnverified(orderId) {
  const id = String(orderId || '').trim();
  if (!id) return { ok: false, reason: 'no_order_id' };
  const order = await getCheckoutOrder(id);
  if (!order || order.gateway !== 'addi') return { ok: false, reason: 'unknown_order' };
  if (order.status === 'approved' || order.status === 'completed') {
    return { ok: true, orderId: id, already: true };
  }
  const notified = await notifyOrder(order, 'ownerNotifiedReturn', { unverified: true });
  return { ok: true, orderId: id, notified, unverified: true };
}
