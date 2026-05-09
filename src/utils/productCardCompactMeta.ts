/**
 * Texto de tarjeta compacta en tienda: tipo de producto + potencia/capacidad según título.
 */

export const CATEGORY_LABEL_ES: Record<string, string> = {
  paneles: 'Panel solar',
  inversores: 'Inversor',
  baterias: 'Batería',
  reflectores: 'Reflector solar',
  controladores: 'Controlador solar',
  protecciones: 'Protección / accesorio',
  cargadores: 'Cargador',
};

function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
}

/** Formatea "11.4" o "11,4" conservando coma decimal española cuando aplica */
function formatDecimalToken(tok: string): string {
  const n = parseFloat(tok.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return tok;
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return String(n).replace('.', ',');
}

/**
 * Extrae una etiqueta corta de potencia o capacidad (kWp, kW, W, kWh) desde el nombre comercial.
 */
export function extractPowerOrCapacityLabel(title: string): string | null {
  const t = title.trim();
  if (!t) return null;
  const u = norm(t);

  let m = t.match(/(\d+(?:[.,]\d+)?)\s*kWp\b/i);
  if (m) return `${formatDecimalToken(m[1])} kWp`;

  m = t.match(/(\d+(?:[.,]\d+)?)\s*kWh\b/i);
  if (m) return `${formatDecimalToken(m[1])} kWh`;

  m = u.match(/LUNA2000-(\d+)(?:KW|K[W]?)(?:-|\/|\b)/);
  if (m) return `${parseInt(m[1], 10)} kWh`;

  m = u.match(/SOLUNA\s+(\d+)\s*K\s+PACK\b/);
  if (m) return `${parseInt(m[1], 10)} kWh`;

  /** Huawei SUN2000-xxKTL, xxK-LC0, etc. */
  m = u.match(/SUN2000-(\d+)K(?:TL|-(?:LC|MGL|M2|MG|HV|KL|H|M3))?[A-Z0-9]*/);
  if (!m) m = u.match(/SUN2000-(\d+)K\b/);
  if (m) return `${parseInt(m[1], 10)} kW`;

  /** Hoymiles microinverters */
  m = u.match(/\bHMS-(\d+)-|\bHMT-(\d+)-/iu);
  if (m) {
    const n = parseInt(m[1] || m[2], 10);
    if (n >= 50) return `${n} W`;
  }

  /** APsystems DS3-LV 900W o “2000W” en modelo */
  m = u.match(/\b(?:DS3[^\s]*|\bAPS\b[^\d]*)(\d{3,5})\s*W\b/ui);
  if (m) return `${parseInt(m[1], 10)} W`;

  m = u.match(/\b(\d{3,5})\s*W\b/i);
  if (m) return `${parseInt(m[1], 10)} W`;

  m = u.match(/(?:^|\s)(\d{1,3}(?:[.,]\d)?)\s*kW\b/ui);
  if (m) return `${formatDecimalToken(m[1])} kW`;

  /** Solis EH1P5K-H, EH1P11.4K, GR1P6K-S, S6-GR3P30K … */
  m = u.match(/EH\d+P(\d+(?:\.\d+)?)K\b/);
  if (!m) m = u.match(/GR\d*P(\d+(?:\.\d+)?)K\b/);
  if (!m) m = u.match(/S\d-[A-Z0-9]+P(\d+(?:\.\d+)?)K\b/);
  if (m) {
    const raw = m[1].replace(',', '.');
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n >= 0.8 && n <= 500) return `${formatDecimalToken(m[1])} kW`;
  }

  /** Cadenas tipo S5-GC15K-LV → 15 kW */
  m = u.match(/-GC(\d+)K\b/);
  if (m) {
    const kw = parseInt(m[1], 10);
    if (kw >= 1 && kw <= 400) return `${kw} kW`;
  }

  /** Número + K tipo “GU333K”, “GC100K” */
  m = u.match(/(?:GU|GC)(\d+)K\b/);
  if (m) {
    const kw = parseInt(m[1], 10);
    if (kw >= 1 && kw <= 600) return `${kw} kW`;
  }

  /** Pytes 5.12 kWh hint en título */
  m = u.match(/5[.,]12\s*KWH|\(5\.12KWH/);
  if (m) return '5,12 kWh';

  return null;
}

export function compactCategoryLabel(category: string): string {
  return CATEGORY_LABEL_ES[category] ?? 'Equipo solar';
}

/**
 * Primera línea de tarjeta: “Inversor · 5 kW” si hay potencia; si no, solo el tipo.
 */
export function formatTipoPotenciaLine(category: string, title: string): string {
  const tipo = compactCategoryLabel(category);
  const p = extractPowerOrCapacityLabel(title);
  return p ? `${tipo} · ${p}` : tipo;
}
