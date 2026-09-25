/**
 * Sesión WhatsApp en Upstash Redis (compartida entre instancias Vercel).
 * TTL 6 h. Sin /tmp — en serverless cada instancia tenía estado distinto.
 */
import { getRedis, isRedisConfigured, waKey } from './whatsapp-redis.js';

const TTL_SEC = 6 * 60 * 60;

/** Fallback en memoria SOLO si Redis no está configurado (dev local). */
const mem = globalThis.__reikiWaSessionsV3 || new Map();
globalThis.__reikiWaSessionsV3 = mem;

let redisMissingLogged = false;

function warnNoRedis(op) {
  if (!redisMissingLogged) {
    redisMissingLogged = true;
    console.error(
      `[reiki-session] Redis NO configurado (${op}). ` +
        `En Vercel hace falta KV_REST_API_URL + KV_REST_API_TOKEN (escritura). ` +
        `Sin Redis las sesiones se pierden entre instancias y se cruzan nombre/ciudad.`
    );
  }
}

const CITY_HINTS = new Set(
  [
    'medellin',
    'medellín',
    'bogota',
    'bogotá',
    'cali',
    'barranquilla',
    'cartagena',
    'bucaramanga',
    'pereira',
    'manizales',
    'armenia',
    'ibague',
    'ibagué',
    'neiva',
    'villavicencio',
    'cucuta',
    'cúcuta',
    'santa marta',
    'pasto',
    'monteria',
    'montería',
    'envigado',
    'itagui',
    'itagüí',
    'bello',
    'rionegro',
    'sabaneta',
    'la ceja',
    'chia',
    'soacha',
    'zipaquira',
    'zipaquirá',
  ].map((c) =>
    c
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
  )
);

/** Clave de sesión: teléfono o BSUID completo */
export function sessionKey(from) {
  const raw = String(from || '').trim();
  if (/^[A-Z]{2}(\.ENT)?\.[A-Za-z0-9]+$/.test(raw)) return raw;
  return raw.replace(/\D/g, '') || raw;
}

function emptySession() {
  return { step: 'idle', data: {}, updatedAt: Date.now() };
}

/**
 * @param {string} from
 * @returns {Promise<{ step: string, data: Record<string, string>, humanUntil?: number, updatedAt: number, msgCount?: number }>}
 */
export async function getSession(from) {
  const id = sessionKey(from);
  const redis = getRedis();
  if (!redis) {
    warnNoRedis('getSession');
    let s = mem.get(id);
    if (!s || Date.now() - (s.updatedAt || 0) > TTL_SEC * 1000) {
      s = emptySession();
      mem.set(id, s);
    }
    return s;
  }
  try {
    const raw = await redis.get(waKey('session', id));
    if (raw && typeof raw === 'object' && raw.step) {
      mem.set(id, raw);
      return raw;
    }
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.step) {
        mem.set(id, parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.error('[reiki-session] getSession redis error', err?.message || err);
  }
  const s = emptySession();
  mem.set(id, s);
  return s;
}

/**
 * @param {string} from
 * @param {object} s
 */
export async function saveSession(from, s) {
  const id = sessionKey(from);
  s.updatedAt = Date.now();
  mem.set(id, s);
  const redis = getRedis();
  if (!redis) {
    warnNoRedis('saveSession');
    return;
  }
  try {
    await redis.set(waKey('session', id), s, { ex: TTL_SEC });
  } catch (err) {
    console.error('[reiki-session] saveSession redis error', err?.message || err);
  }
}

/**
 * @param {string} from
 */
export async function resetSession(from) {
  const id = sessionKey(from);
  const s = emptySession();
  mem.set(id, s);
  const redis = getRedis();
  if (!redis) {
    warnNoRedis('resetSession');
    return s;
  }
  try {
    await redis.set(waKey('session', id), s, { ex: TTL_SEC });
  } catch (err) {
    console.error('[reiki-session] resetSession redis error', err?.message || err);
  }
  return s;
}

export function isRedisSessionReady() {
  return isRedisConfigured();
}

export function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\u200B-\u200D\uFEFF\u2060\u00A0]/g, '')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .toLowerCase();
}

export function isLikelyCity(text) {
  const n = normalizeText(text);
  if (!n || n.length < 3) return false;
  if (CITY_HINTS.has(n)) return true;
  for (const c of CITY_HINTS) {
    if (n === c || n.startsWith(c + ' ') || n.includes(' ' + c)) return true;
  }
  return false;
}

/** Nombre corto de persona (1-3 palabras), sin dígitos ni $ */
export function isLikelyPersonName(text) {
  const t = String(text || '').trim();
  if (!t || t.length > 60) return false;
  if (/[0-9$€]|kwh|factura|panel|inversor|bateria|batería/i.test(t)) return false;
  if (isLikelyCity(t)) return false;
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 3) return false;
  if (/^(me llamo|soy|mi nombre|hola|buenas)\b/i.test(t)) {
    const rest = t.replace(/^(me llamo|soy|mi nombre es|mi nombre)\s+/i, '').trim();
    return isLikelyPersonName(rest) || (rest.length >= 2 && rest.split(/\s+/).length <= 3);
  }
  return true;
}

export function extractPersonName(text) {
  const t = String(text || '').trim();
  const m = t.match(/^(?:me llamo|soy|mi nombre es|mi nombre)\s+(.+)$/i);
  return (m ? m[1] : t).trim().slice(0, 80);
}
