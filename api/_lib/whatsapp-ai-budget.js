/**
 * Topes de costo Claude: por cliente/día y presupuesto mensual (Redis).
 * Precios Haiku: entrada $1/M, cache read $0.10/M, salida $5/M.
 */
import { getRedis, waKey } from './whatsapp-redis.js';

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT_PER_USER) > 0 ? Number(process.env.AI_DAILY_LIMIT_PER_USER) : 15;
const MONTHLY_BUDGET = Number(process.env.AI_MONTHLY_BUDGET_USD) > 0 ? Number(process.env.AI_MONTHLY_BUDGET_USD) : 5;

const PRICE_INPUT = 1 / 1_000_000;
const PRICE_CACHE_READ = 0.1 / 1_000_000;
const PRICE_OUTPUT = 5 / 1_000_000;
const PRICE_CACHE_WRITE = 1.25 / 1_000_000; // creation; no en el brief, se registra igual

function bogotaYmd(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // YYYY-MM-DD
}

function bogotaYm(d = new Date()) {
  return bogotaYmd(d).slice(0, 7); // YYYY-MM
}

function secondsUntilBogotaMidnight() {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const h = Number(parts.hour);
  const m = Number(parts.minute);
  const s = Number(parts.second);
  const elapsed = h * 3600 + m * 60 + s;
  return Math.max(60, 24 * 3600 - elapsed + 5);
}

function secondsUntilNextMonthBogota() {
  const ymd = bogotaYmd();
  const [y, mo] = ymd.split('-').map(Number);
  const next = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`;
  // rough: days left * 86400
  const day = Number(ymd.slice(8, 10));
  const daysInMonth = new Date(y, mo, 0).getDate();
  return Math.max(3600, (daysInMonth - day + 1) * 86400);
}

export function estimateCostUsd(usage = {}) {
  const input = Number(usage.input_tokens || 0);
  const out = Number(usage.output_tokens || 0);
  const cacheRead = Number(usage.cache_read_input_tokens || 0);
  const cacheWrite = Number(usage.cache_creation_input_tokens || 0);
  return (
    input * PRICE_INPUT +
    cacheRead * PRICE_CACHE_READ +
    cacheWrite * PRICE_CACHE_WRITE +
    out * PRICE_OUTPUT
  );
}

export async function isMonthlyBudgetExhausted() {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const raw = await redis.get(waKey('ai_month', bogotaYm()));
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data) return false;
    return Number(data.costUsd || 0) >= MONTHLY_BUDGET;
  } catch {
    return false;
  }
}

export async function getDailyAiCount(from) {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    const n = await redis.get(waKey('ai_day', `${from}:${bogotaYmd()}`));
    return Number(n) || 0;
  } catch {
    return 0;
  }
}

/**
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function canUseAi(from) {
  if (!String(process.env.ANTHROPIC_API_KEY || '').trim()) {
    return { ok: false, reason: 'no_key' };
  }
  if (await isMonthlyBudgetExhausted()) {
    return { ok: false, reason: 'budget' };
  }
  const dayCount = await getDailyAiCount(from);
  if (dayCount >= DAILY_LIMIT) {
    return { ok: false, reason: 'daily' };
  }
  return { ok: true };
}

/**
 * Registra una respuesta de IA (tras éxito).
 * @param {string} from
 * @param {object} usage Anthropic usage
 */
export async function recordAiUsage(from, usage = {}) {
  const redis = getRedis();
  const cost = estimateCostUsd(usage);
  const day = bogotaYmd();
  const month = bogotaYm();

  if (!redis) {
    console.warn('[ai-budget] sin Redis — no se contabiliza uso', { from, cost });
    return { costUsd: cost };
  }

  try {
    const dayKey = waKey('ai_day', `${from}:${day}`);
    const dayN = await redis.incr(dayKey);
    if (dayN === 1) await redis.expire(dayKey, secondsUntilBogotaMidnight());

    const monthKey = waKey('ai_month', month);
    let data = (await redis.get(monthKey)) || {};
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    }
    data = {
      costUsd: Number(data.costUsd || 0) + cost,
      input_tokens: Number(data.input_tokens || 0) + Number(usage.input_tokens || 0),
      output_tokens: Number(data.output_tokens || 0) + Number(usage.output_tokens || 0),
      cache_read_input_tokens:
        Number(data.cache_read_input_tokens || 0) + Number(usage.cache_read_input_tokens || 0),
      cache_creation_input_tokens:
        Number(data.cache_creation_input_tokens || 0) + Number(usage.cache_creation_input_tokens || 0),
      calls: Number(data.calls || 0) + 1,
      conversations: Number(data.conversations || 0),
      updatedAt: new Date().toISOString(),
      budgetUsd: MONTHLY_BUDGET,
      dailyLimit: DAILY_LIMIT,
    };
    // conversaciones únicas del mes
    const convKey = waKey('ai_month_convs', month);
    const added = await redis.sadd(convKey, String(from));
    if (added) data.conversations = Number(data.conversations || 0) + 1;
    await redis.expire(convKey, secondsUntilNextMonthBogota());
    await redis.set(monthKey, data, { ex: secondsUntilNextMonthBogota() });

    return { costUsd: cost, dayN, month: data };
  } catch (err) {
    console.warn('[ai-budget] record error', err?.message || err);
    return { costUsd: cost };
  }
}

export async function getAiUsageReport() {
  const redis = getRedis();
  const month = bogotaYm();
  const day = bogotaYmd();
  if (!redis) {
    return {
      ok: false,
      error: 'Redis no configurado',
      month,
      budgetUsd: MONTHLY_BUDGET,
      dailyLimit: DAILY_LIMIT,
    };
  }
  try {
    let data = (await redis.get(waKey('ai_month', month))) || {};
    if (typeof data === 'string') data = JSON.parse(data);
    const convs = await redis.scard(waKey('ai_month_convs', month)).catch(() => 0);
    return {
      ok: true,
      month,
      day,
      budgetUsd: MONTHLY_BUDGET,
      dailyLimit: DAILY_LIMIT,
      costUsd: Number(data.costUsd || 0),
      remainingUsd: Math.max(0, MONTHLY_BUDGET - Number(data.costUsd || 0)),
      exhausted: Number(data.costUsd || 0) >= MONTHLY_BUDGET,
      calls: Number(data.calls || 0),
      conversations: Number(convs || data.conversations || 0),
      tokens: {
        input: Number(data.input_tokens || 0),
        output: Number(data.output_tokens || 0),
        cache_read: Number(data.cache_read_input_tokens || 0),
        cache_creation: Number(data.cache_creation_input_tokens || 0),
      },
      prices: {
        input_per_m: 1,
        cache_read_per_m: 0.1,
        output_per_m: 5,
      },
      updatedAt: data.updatedAt || null,
    };
  } catch (err) {
    return { ok: false, error: String(err?.message || err), month };
  }
}

/** True si el error de Anthropic es saldo / spend limit / rate. */
export function isAiCreditOrLimitError(err) {
  const status = Number(err?.status || err?.statusCode || 0);
  const msg = String(err?.message || err || '').toLowerCase();
  if (status === 429) return true;
  if (status === 400 || status === 402 || status === 403) {
    return /credit|billing|spend|limit|quota|insufficient|balance|payment|rate/.test(msg);
  }
  return /credit|billing|spend limit|insufficient_quota|rate_limit/.test(msg);
}

export { DAILY_LIMIT, MONTHLY_BUDGET };
