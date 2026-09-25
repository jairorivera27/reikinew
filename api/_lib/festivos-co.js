/**
 * Festivos Colombia 2026–2027 (días no hábiles para horario y validez de cotización).
 * Fechas según calendario de festivos nacionales (incl. traslado a lunes cuando aplica).
 */
const FESTIVOS = new Set([
  // 2026
  '2026-01-01', // Año Nuevo
  '2026-01-12', // Reyes Magos
  '2026-03-23', // San José
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-18', // Ascensión del Señor
  '2026-06-08', // Corpus Christi
  '2026-06-15', // Sagrado Corazón
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-20', // Independencia
  '2026-08-07', // Batalla de Boyacá
  '2026-08-17', // Asunción de la Virgen
  '2026-10-12', // Día de la Raza
  '2026-11-02', // Todos los Santos
  '2026-11-16', // Independencia de Cartagena
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
  // 2027
  '2027-01-01',
  '2027-01-11', // Reyes Magos
  '2027-03-22', // San José
  '2027-03-25', // Jueves Santo
  '2027-03-26', // Viernes Santo
  '2027-05-01',
  '2027-05-17', // Ascensión
  '2027-06-07', // Corpus Christi
  '2027-06-14', // Sagrado Corazón
  '2027-07-05', // San Pedro y San Pablo
  '2027-07-20',
  '2027-08-07',
  '2027-08-16', // Asunción
  '2027-10-18', // Día de la Raza
  '2027-11-01', // Todos los Santos
  '2027-11-15', // Independencia de Cartagena
  '2027-12-08',
  '2027-12-25',
]);

/** YYYY-MM-DD en America/Bogota */
export function bogotaYmd(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isFestivoColombia(date = new Date()) {
  return FESTIVOS.has(bogotaYmd(date));
}

export function isFestivoYmd(ymd) {
  return FESTIVOS.has(String(ymd || ''));
}

/** Lista (copia) para docs/tests */
export function listFestivosCo() {
  return [...FESTIVOS].sort();
}
