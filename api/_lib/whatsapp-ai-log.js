/**
 * Log de preguntas/respuestas IA (sin teléfono ni nombre) para mejorar el bot.
 * Redis lista últimos 200, TTL 30 días.
 */
import { getRedis, waKey } from './whatsapp-redis.js';

const LOG_KEY = waKey('aiqa', 'log');
const MAX = 200;
const TTL_SEC = 30 * 24 * 3600;

const logMem = globalThis.__reikiAiQaLog || [];
globalThis.__reikiAiQaLog = logMem;

/**
 * @param {{ pregunta: string, respuesta: string, tools?: string[] }} entry
 */
export async function appendAiQaLog(entry) {
  const row = {
    fecha: new Date().toISOString(),
    fecha_bogota: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
    pregunta: String(entry.pregunta || '').slice(0, 2000),
    respuesta: String(entry.respuesta || '').slice(0, 4000),
    tools: Array.isArray(entry.tools) ? entry.tools.slice(0, 20) : [],
  };

  logMem.unshift(row);
  if (logMem.length > MAX) logMem.length = MAX;

  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.lpush(LOG_KEY, JSON.stringify(row));
    await redis.ltrim(LOG_KEY, 0, MAX - 1);
    await redis.expire(LOG_KEY, TTL_SEC);
  } catch (err) {
    console.warn('[whatsapp-ai-log]', err?.message || err);
  }
}

export async function getAiQaLog(limit = 50) {
  const n = Math.min(MAX, Math.max(1, Number(limit) || 50));
  const redis = getRedis();
  if (redis) {
    try {
      const rows = await redis.lrange(LOG_KEY, 0, n - 1);
      return (rows || []).map((r) => {
        if (typeof r === 'object' && r) return r;
        try {
          return JSON.parse(r);
        } catch {
          return { raw: String(r) };
        }
      });
    } catch (err) {
      console.warn('[whatsapp-ai-log] get', err?.message || err);
    }
  }
  return logMem.slice(0, n);
}
