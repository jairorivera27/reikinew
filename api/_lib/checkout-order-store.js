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
  if (!s) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }
  // Fecha calendario ya en YYYY-MM-DD: no parsear como UTC (evita correr un día)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    }
  } catch {
    /* fall through */
  }
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

function todayBogotaYmd() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
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
      const dayBog = dayKeyFromIso(createdAt);
      const dayUtc =
        String(createdAt).length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(String(createdAt))
          ? String(createdAt).slice(0, 10)
          : dayBog;
      await redis.lpush(dayListKey(dayBog), orderId);
      await redis.expire(dayListKey(dayBog), ORDER_TTL_SEC);
      // Compat: índices viejos usaban día UTC; dual-write evita huecos en búsqueda
      if (dayUtc !== dayBog) {
        await redis.lpush(dayListKey(dayUtc), orderId);
        await redis.expire(dayListKey(dayUtc), ORDER_TTL_SEC);
      }
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
    // ±1 día cubre desfase UTC vs Bogotá en índices antiguos
    daysToScan = ymdRange(String(fecha).slice(0, 10), 1, 1);
  } else {
    const todayBog = todayBogotaYmd();
    const todayUtc = new Date().toISOString().slice(0, 10);
    const span = Math.min(days + 1, 31);
    const uniq = new Set();
    for (let i = 0; i < span; i += 1) {
      uniq.add(addDaysYmd(todayBog, -i));
      uniq.add(addDaysYmd(todayUtc, -i));
    }
    daysToScan = Array.from(uniq);
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

  // Rescate: si el índice diario está vacío/roto, escanear claves de pedidos
  if (!matches.length && !docNorm && !nameNorm && !fecha) {
    const recovered = await scanCheckoutOrdersFallback(days);
    matches.push(...recovered);
  }

  matches.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  return matches;
}

/**
 * Fallback cuando las listas chkday:* no tienen IDs (índice dañado o huso horario).
 */
async function scanCheckoutOrdersFallback(days = 7) {
  const redis = getRedis();
  if (!redis) return [];
  const out = [];
  const seen = new Set();
  try {
    const keys = await redis.keys('reiki:wa:chk:*');
    const list = Array.isArray(keys) ? keys : [];
    const cutoff = Date.now() - Math.min(Math.max(Number(days) || 7, 1), 90) * 86400000;
    for (const key of list) {
      const k = String(key || '');
      // Solo pedidos: reiki:wa:chk:<orderId> (no chkday)
      if (!k.startsWith('reiki:wa:chk:') || k.startsWith('reiki:wa:chkday:')) continue;
      const orderId = k.slice('reiki:wa:chk:'.length);
      if (!orderId || seen.has(orderId)) continue;
      seen.add(orderId);
      const order = await getCheckoutOrder(orderId);
      if (!order) continue;
      const ts = Date.parse(order.paidAt || order.updatedAt || order.createdAt || '') || 0;
      if (ts && ts < cutoff) continue;
      out.push(order);
      // Reparar índice diario para próximas búsquedas
      try {
        const dayBog = dayKeyFromIso(order.createdAt || order.paidAt);
        await redis.lpush(dayListKey(dayBog), orderId);
        await redis.expire(dayListKey(dayBog), ORDER_TTL_SEC);
      } catch {
        /* ignore repair errors */
      }
    }
  } catch (err) {
    console.warn('[checkout-order-store] scan fallback', err?.message || err);
  }
  return out;
}

export async function listRecentCheckoutOrders(days = 3) {
  return searchCheckoutOrders({ dias: days });
}
