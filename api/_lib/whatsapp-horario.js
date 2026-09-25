/**
 * Horario hábil Reiki (America/Bogota).
 * BUSINESS_DAYS: 1=lunes … 6=sábado, 7=domingo (también se acepta 0=domingo).
 * Default: 1,2,3,4,5,6 (lun–sáb).
 * Excluye festivos de Colombia (api/_lib/festivos-co.js).
 */
import { isFestivoColombia } from './festivos-co.js';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function getBusinessHoursConfig() {
  const start = Number(process.env.BUSINESS_HOURS_START);
  const end = Number(process.env.BUSINESS_HOURS_END);
  const daysRaw = String(process.env.BUSINESS_DAYS || '1,2,3,4,5,6');
  const days = daysRaw
    .split(/[,;\s]+/)
    .map((d) => Number(d))
    .map((d) => (d === 0 ? 7 : d))
    .filter((d) => d >= 1 && d <= 7);
  return {
    start: Number.isFinite(start) && start >= 0 ? start : 8,
    end: Number.isFinite(end) && end > 0 ? end : 18,
    days: days.length ? [...new Set(days)] : [1, 2, 3, 4, 5, 6],
    tz: 'America/Bogota',
  };
}

/** Partes de fecha/hora en Bogotá. */
export function bogotaParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const wd = String(parts.weekday || '').toLowerCase();
  const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const dow = map[wd.slice(0, 3)] ?? 0;
  const businessDow = dow === 0 ? 7 : dow;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dow,
    businessDow,
  };
}

function isBusinessCalendarDay(date, cfg = getBusinessHoursConfig()) {
  const p = bogotaParts(date);
  if (!cfg.days.includes(p.businessDow)) return false;
  if (isFestivoColombia(date)) return false;
  return true;
}

export function isWithinBusinessHours(date = new Date()) {
  const cfg = getBusinessHoursConfig();
  if (!isBusinessCalendarDay(date, cfg)) return false;
  const p = bogotaParts(date);
  if (p.hour < cfg.start) return false;
  if (p.hour >= cfg.end) return false;
  return true;
}

/**
 * Etiqueta del próximo momento hábil, ej. "8:00 del lunes".
 * Salta fines de semana y festivos CO.
 */
export function nextBusinessOpenLabel(date = new Date()) {
  const cfg = getBusinessHoursConfig();
  const p = bogotaParts(date);

  if (isBusinessCalendarDay(date, cfg) && p.hour < cfg.start) {
    return `${cfg.start}:00 del ${DAY_NAMES[p.dow]}`;
  }

  for (let i = 1; i <= 21; i += 1) {
    const probe = new Date(date.getTime() + i * 24 * 60 * 60 * 1000);
    if (isBusinessCalendarDay(probe, cfg)) {
      const np = bogotaParts(probe);
      return `${cfg.start}:00 del ${DAY_NAMES[np.dow]}`;
    }
  }
  return `${cfg.start}:00 del próximo día hábil`;
}

/** "muy pronto" o "a partir de las 8:00 del lunes" */
export function handoffTimingPhrase(date = new Date()) {
  if (isWithinBusinessHours(date)) return 'muy pronto';
  return `a partir de las ${nextBusinessOpenLabel(date)}`;
}

export { isBusinessCalendarDay };
