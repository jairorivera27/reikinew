/**
 * Cliente Upstash Redis (Vercel KV Marketplace).
 * Env aceptadas:
 *   KV_REST_API_URL + KV_REST_API_TOKEN  (Vercel KV)
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *
 * Importante: el token READ_ONLY no sirve para escribir. Usa KV_REST_API_TOKEN.
 */
import { Redis } from '@upstash/redis';

let client = null;
let warned = false;

export function isRedisConfigured() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token);
}

export function getRedis() {
  if (client) return client;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warned) {
      warned = true;
      console.warn(
        '[reiki-redis] Sin KV_REST_API_URL/TOKEN — historial y sesiones de IA quedan en memoria del proceso.'
      );
    }
    return null;
  }
  client = new Redis({ url, token });
  return client;
}

const PREFIX = 'reiki:wa:';

export function waKey(kind, id) {
  return `${PREFIX}${kind}:${String(id || '').trim()}`;
}
