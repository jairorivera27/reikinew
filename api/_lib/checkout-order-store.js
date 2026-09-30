/**
 * Pedidos de checkout (carrito Wompi / Addi) en Redis + memoria de proceso.
 */
import { getRedis, waKey } from './whatsapp-redis.js';

const ORDER_TTL_SEC = 90 * 24 * 3600;
const ordersMem = globalThis.__reikiCheckoutOrders || new Map();
globalThis.__reikiCheckoutOrders = ordersMem;
const dayIndexMem = globalThis.__reikiCheckoutDayIdx || new Map();
globalThis.__reikiCheckoutDayIdx = dayIndexMem;

export function cleanDoc(doc) {
  return String(doc || '').replace(/\D/g, '').slice(0, 20);
}

export function normalizeName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function dayKeyFromIso(iso) {
  const s = String(iso || '').trim();
  if (s.length >= 10) return s.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function orderKey(id) {
  return waKey('chk', String(id || '').trim());
}

function dayListKey(day) {
  return waKey('chkday', dayKeyFromIso(day));
}

/**
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function saveCheckoutOrder(input) {
  const orderId = String(input.orderId || input.reference || '').trim();
  if (!orderId) throw new Error('orderId obligatorio');

  const client = input.client || {};
  const createdAt = String(input.createdAt || new Date().toISOString());
  const doc = {
    orderId,
    reference: String(input.reference || orderId).trim(),
    gateway: String(input.gateway || 'wompi').toLowerCase(),
    status: String(input.status || 'pending').toLowerCase(),
    totalAmount: Math.round(Number(input.totalAmount) || 0),
    items: Array.isArray(input.items) ? input.items : [],
    client: {
      fullName: String(client.fullName || client.nombre || '').trim(),
      email: String(client.email || client.correo || '')
        .trim()
        .toLowerCase(),
      phone: String(client.phone || client.cellphone || client.celular || '').trim(),
      idNumber: cleanDoc(client.idNumber || client.document),
      idType: String(client.idType || 'CC'),
    },
    shippingAddress: input.shippingAddress || null,
    wompiTransactionId: input.wompiTransactionId || null,
    addiApplicationId: input.addiApplicationId || null,
    ownerNotified: Boolean(input.ownerNotified),
    workflowStatus: String(input.workflowStatus || 'nuevo').toLowerCase(),
    createdAt,
    updatedAt: createdAt,
    paidAt: input.paidAt || null,
    idNumberNorm: cleanDoc(client.idNumber || client.document),
    nameNorm: normalizeName(client.fullName || client.nombre),
  };

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(orderKey(orderId), doc, { ex: ORDER_TTL_SEC });
      const day = dayKeyFromIso(createdAt);
      await redis.lpush(dayListKey(day), orderId);
      await redis.expire(dayListKey(day), ORDER_TTL_SEC);
    } catch (err) {
      console.warn('[checkout-order-store] redis set', err?.message || err);
    }
  }

  ordersMem.set(orderId, doc);
  const day = dayKeyFromIso(createdAt);
  const list = dayIndexMem.get(day) || [];
  if (!list.includes(orderId)) {
    list.unshift(orderId);
    dayIndexMem.set(day, list);
  }

  return doc;
}

export async function getCheckoutOrder(orderId) {
  const id = String(orderId || '').trim();
  if (!id) return null;

  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(orderKey(id));
      if (raw && typeof raw === 'object') {
        ordersMem.set(id, raw);
        return raw;
      }
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        ordersMem.set(id, parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('[checkout-order-store] redis get', err?.message || err);
    }
  }
  return ordersMem.get(id) || null;
}

export async function patchCheckoutOrder(orderId, patch = {}) {
  const prev = await getCheckoutOrder(orderId);
  if (!prev) return null;

  const next = {
    ...prev,
    ...patch,
    client: { ...prev.client, ...(patch.client || {}) },
    updatedAt: new Date().toISOString(),
  };
  if (patch.client?.fullName) next.nameNorm = normalizeName(patch.client.fullName);
  if (patch.client?.idNumber) next.idNumberNorm = cleanDoc(patch.client.idNumber);

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(orderKey(orderId), next, { ex: ORDER_TTL_SEC });
    } catch (err) {
      console.warn('[checkout-order-store] redis patch', err?.message || err);
    }
  }
  ordersMem.set(String(orderId), next);
  return next;
}

function addDaysYmd(ymd, delta) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function ymdRange(centerYmd, daysBefore = 0, daysAfter = 0) {
  const c = dayKeyFromIso(centerYmd);
  const out = [];
  for (let i = -daysBefore; i <= daysAfter; i += 1) {
    out.push(addDaysYmd(c, i));
  }
  return out;
}

async function listOrderIdsForDay(day) {
  const redis = getRedis();
  if (redis) {
    try {
      const ids = await redis.lrange(dayListKey(day), 0, 500);
      if (Array.isArray(ids) && ids.length) return ids.map(String);
    } catch (err) {
      console.warn('[checkout-order-store] redis lrange', err?.message || err);
    }
  }
  return dayIndexMem.get(dayKeyFromIso(day)) || [];
}

/**
 * Busca pedidos por nombre, documento y/o fecha (±1 día alrededor de la fecha).
 */
export async function searchCheckoutOrders({ nombre, documento, fecha, dias = 3 } = {}) {
  const docNorm = cleanDoc(documento);
  const nameNorm = normalizeName(nombre);
  const days = Math.min(Math.max(Number(dias) || 3, 1), 30);

  let daysToScan = [];
  if (fecha) {
    daysToScan = ymdRange(fecha, 1, 1);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < days; i += 1) {
      daysToScan.push(addDaysYmd(today, -i));
    }
  }

  const seen = new Set();
  const matches = [];

  for (const day of daysToScan) {
    const ids = await listOrderIdsForDay(day);
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const order = await getCheckoutOrder(id);
      if (!order) continue;

      if (docNorm && order.idNumberNorm !== docNorm) continue;

      if (nameNorm) {
        const hay = order.nameNorm || '';
        if (!hay.includes(nameNorm) && !nameNorm.split(' ').every((p) => p.length < 3 || hay.includes(p))) {
          continue;
        }
      }

      matches.push(order);
    }
  }

  matches.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  return matches;
}

export async function listRecentCheckoutOrders(days = 3) {
  return searchCheckoutOrders({ dias: days });
}
