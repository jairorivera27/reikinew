/**
 * Idempotencia de message.id y lock por usuario (anti-carrera entre instancias).
 */
import { getRedis, waKey } from './whatsapp-redis.js';

const MSG_TTL_SEC = 48 * 60 * 60;
const LOCK_TTL_SEC = 20;

/**
 * Marca message.id como procesado (SET NX).
 * @returns {Promise<boolean>} true si es la primera vez (hay que procesar)
 */
export async function claimMessageId(messageId) {
  const id = String(messageId || '').trim();
  if (!id) return true;
  const redis = getRedis();
  if (!redis) {
    console.error(
      '[reiki-idem] Redis no configurado — no se puede deduplicar message.id. Revisa KV_REST_API_TOKEN.'
    );
    return true;
  }
  try {
    const ok = await redis.set(waKey('msgid', id), '1', { nx: true, ex: MSG_TTL_SEC });
    // Upstash puede devolver "OK" o true
    if (ok === null || ok === undefined || ok === false) {
      console.log('[reiki-idem] mensaje duplicado ignorado', id);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[reiki-idem] claim error', err?.message || err);
    return true;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Ejecuta fn con lock exclusivo por `from` (SET NX, 20 s).
 * Espera hasta ~12 s si otro worker tiene el lock.
 */
export async function withUserLock(from, fn) {
  const id = String(from || '').trim();
  const redis = getRedis();
  if (!redis || !id) {
    if (!redis) {
      console.error(
        '[reiki-lock] Redis no configurado — sin serialización por usuario. Revisa KV_REST_API_TOKEN.'
      );
    }
    return fn();
  }
  const key = waKey('lock', id);
  const deadline = Date.now() + 12_000;
  let acquired = false;
  while (Date.now() < deadline) {
    try {
      const ok = await redis.set(key, String(Date.now()), { nx: true, ex: LOCK_TTL_SEC });
      if (ok !== null && ok !== undefined && ok !== false) {
        acquired = true;
        break;
      }
    } catch (err) {
      console.error('[reiki-lock] set error', err?.message || err);
      return fn();
    }
    await sleep(250);
  }
  if (!acquired) {
    console.warn('[reiki-lock] timeout esperando lock', id);
  }
  try {
    return await fn();
  } finally {
    if (acquired) {
      try {
        await redis.del(key);
      } catch {
        /* expire alone */
      }
    }
  }
}
