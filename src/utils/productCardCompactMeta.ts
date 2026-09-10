/**
 * Extrae tipo / potencia / marca (y más) para la línea morada de la tarjeta.
 */
export const CATEGORY_LABEL_ES: Record<string, string> = {
  paneles: 'Panel solar',
  inversores: 'Inversor',
  baterias: 'Batería Litio',
  reflectores: 'Reflector solar',
  controladores: 'Controlador',
  protecciones: 'Protección eléctrica',
  cargadores: 'Cargador',
  monitoreo: 'Equipo de monitoreo',
  bombeo: 'Bomba solar',
  accesorios: 'Accesorio',
};

export type TipoInversor = 'On-Grid' | 'Off-Grid' | 'Híbrido' | 'Microinversor';

function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
}

function formatDecimalToken(tok: string): string {
  const normalized =
    tok.includes(',') && !tok.includes('.')
      ? tok.replace(',', '.')
      : tok.replace(/,(?=\d{3}\b)/g, '');
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return tok;
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return String(n).replace('.', ',');
}

export function potenciaDesdeCampo(power?: string): string | null {
  if (!power) return null;
  const t = power.trim();
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*kWh\b/i);
  if (m) return `${formatDecimalToken(m[1])} kWh`;
  m = t.match(/(\d+(?:[.,]\d+)?)\s*kW\b/i);
  if (m) return `${formatDecimalToken(m[1])} kW`;
  m = t.match(/(\d+(?:[.,]\d+)?)\s*W\b/i);
  if (m) {
    const w = parseFloat(m[1].replace(',', '.'));
    if (Number.isFinite(w) && w >= 1000 && w % 1000 === 0) {
      return `${formatDecimalToken(String(w / 1000))} kW`;
    }
    return `${formatDecimalToken(m[1])} W`;
  }
  m = t.match(/^(\d+(?:[.,]\d+)?)$/);
  if (m) return `${formatDecimalToken(m[1])} kW`;
  return null;
}

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

  m = u.match(/SUN2000-(\d+(?:[.,]\d+)?)K(?:TL|-(?:LC|MGL|M2|MG|HV|KL|H|M3))?[A-Z0-9]*/);
  if (!m) m = u.match(/SUN2000-(\d+(?:[.,]\d+)?)K\b/);
  if (m) return `${formatDecimalToken(m[1])} kW`;

  m = u.match(/\bHMS-(\d+)-|\bHMT-(\d+)-/iu);
  if (m) {
    const n = parseInt(m[1] || m[2], 10);
    if (n >= 50) return `${n} W`;
  }

  m = u.match(/\b(?:DS3[^\s]*|\bAPS\b[^\d]*)(\d{3,5})\s*W\b/ui);
  if (m) return `${parseInt(m[1], 10)} W`;

  m = u.match(/EH\d+P(\d+(?:[.,]\d+)?)K\b/);
  if (m) return `${formatDecimalToken(m[1])} kW`;

  m = u.match(/GR\d*P(\d+(?:[.,]\d+)?)K\b/);
  if (!m) m = u.match(/S\d-[A-Z0-9]*P(\d+(?:[.,]\d+)?)K\b/);
  if (!m) m = u.match(/-GC(\d+(?:[.,]\d+)?)K\b/);
  if (!m) m = u.match(/(?:GU|GC)(\d+(?:[.,]\d+)?)K\b/);
  if (m) {
    const n = parseFloat(m[1].replace(',', '.'));
    if (Number.isFinite(n) && n >= 0.8 && n <= 600) return `${formatDecimalToken(m[1])} kW`;
  }

  m = u.match(/\bMIN\s*(\d{4,5})\b/);
  if (m) {
    const w = parseInt(m[1], 10);
    if (w >= 1000) return `${formatDecimalToken(String(w / 1000))} kW`;
  }
  m = u.match(/\b(\d{4,5})TL\b/);
  if (m) {
    const w = parseInt(m[1], 10);
    if (w >= 1000 && w <= 50000) return `${formatDecimalToken(String(w / 1000))} kW`;
  }

  m = t.match(/(\d+(?:[.,]\d+)?)\s*kW\b/i);
  if (m) {
    const n = parseFloat(m[1].replace(',', '.'));
    if (n >= 0.5 && n <= 600) return `${formatDecimalToken(m[1])} kW`;
  }

  m = u.match(/\b(\d{3,5})\s*W\b/i);
  if (m) {
    const w = parseInt(m[1], 10);
    // En inversores, 3000 W+ se muestra en kW para el título morado.
    if (w >= 1000 && w <= 600000) {
      return `${formatDecimalToken(String(w / 1000))} kW`;
    }
    if (w >= 50) return `${w} W`;
  }

  m = u.match(/\bQUATTRO\b[^\d]*(\d{4,5})\b/);
  if (!m) m = u.match(/\bMULTIPLUS\b[^\d]*(\d{4,5})\b/);
  if (!m) m = u.match(/\b(?:PHOENIX|XTENDER)\b[^\d]*(\d{4,5})\b/);
  if (!m) m = u.match(/\b(12|24|48)\s*\/\s*(\d{3,5})\b/);
  if (m && m[2]) {
    const w = parseInt(m[2], 10);
    if (w >= 250) return w >= 1000 ? `${formatDecimalToken(String(w / 1000))} kW` : `${w} W`;
  } else if (m && m[1] && !m[2]) {
    const w = parseInt(m[1], 10);
    if (w >= 250) return w >= 1000 ? `${formatDecimalToken(String(w / 1000))} kW` : `${w} W`;
  }

  return null;
}

export function detectarTipoInversor(
  title: string,
  model?: string,
  brand?: string
): TipoInversor | null {
  const t = norm(`${title} ${model ?? ''} ${brand ?? ''}`);

  if (/MICROINVERSOR|\bHMS-|\bHMT-|\bDS3|\bQT2\b|\bMI-\d/.test(t)) return 'Microinversor';
  if (/HIBRID|HYBRID/.test(t)) return 'Híbrido';
  if (/OFF[\s-]?GRID|AISLAD/.test(t)) return 'Off-Grid';
  if (/ON[\s-]?GRID|GRID[\s-]?TIE|INTERCONEX/.test(t)) return 'On-Grid';

  if (/\bEH\d|QUATTRO|MULTIPLUS|MULTI PLUS|XTENDER|CONEXT|PHOENIX/.test(t)) {
    if (/PHOENIX/.test(t) && !/MULTIPLUS|QUATTRO/.test(t)) return 'Off-Grid';
    return 'Híbrido';
  }
  if (/\bMUST\b.*\bPV|\bPV\d{2}-\d/.test(t)) return 'Híbrido';

  if (/SUN2000|KTL|\bMIN\b|\bMID\b|TL-X|TLXH|\bTLX\b|\bGC\d|\bGR\d|AFCI/.test(t)) {
    return 'On-Grid';
  }

  if (/INVERSOR|INVERTER/.test(t)) return 'On-Grid';
  return null;
}

export function compactCategoryLabel(category: string): string {
  return CATEGORY_LABEL_ES[category] ?? 'Equipo solar';
}

export interface MetaProductoLinea {
  brand?: string;
  model?: string;
  power?: string;
}

function marcaLimpia(brand?: string): string | null {
  const m = String(brand ?? '').trim();
  if (!m || /^sin marca$/i.test(m)) return null;
  return m;
}

/** Datos de batería: V, Ah, kWh (Ah se estima si solo hay V + kWh). */
function metaBateria(title: string, power?: string, model?: string): string[] {
  const texto = `${title} ${power ?? ''} ${model ?? ''}`;
  const partes: string[] = [];
  const vMatch = texto.match(/(\d+(?:[.,]\d+)?)\s*V(?:DC)?\b/i);
  const ahMatch = texto.match(/(\d+(?:[.,]\d+)?)\s*Ah\b/i);
  let kwhMatch = texto.match(/(\d+(?:[.,]\d+)?)\s*kWh\b/i);
  if (!kwhMatch) {
    const wh = texto.match(/(\d+(?:[.,]\d+)?)\s*Wh\b/i);
    if (wh) {
      const whn = parseFloat(wh[1].replace(',', '.'));
      if (Number.isFinite(whn) && whn >= 100) {
        kwhMatch = [wh[0], formatDecimalToken(String(whn / 1000))] as RegExpMatchArray;
      }
    }
  }

  // Modelos tipo FLA48280 / FLA24171 → Ah embebido al final
  let ahFromModel: number | undefined;
  const mAh =
    `${model ?? ''} ${title}`.match(/\bFLA\d{2}(\d{3})\b/i) ||
    `${model ?? ''} ${title}`.match(/\bBX\d{2}(\d{3})\b/i);
  if (mAh) {
    const n = parseInt(mAh[1], 10);
    if (n >= 50 && n <= 600) ahFromModel = n;
  }

  const vNum = vMatch ? parseFloat(vMatch[1].replace(',', '.')) : NaN;
  const ahNum = ahMatch ? parseFloat(ahMatch[1].replace(',', '.')) : ahFromModel ?? NaN;
  let kwhNum = kwhMatch ? parseFloat(String(kwhMatch[1]).replace(',', '.')) : NaN;

  if (!Number.isFinite(kwhNum)) {
    const cap = extractPowerOrCapacityLabel(title) || potenciaDesdeCampo(power);
    if (cap && /kWh/i.test(cap)) {
      const m = cap.match(/(\d+(?:[.,]\d+)?)/);
      if (m) kwhNum = parseFloat(m[1].replace(',', '.'));
    }
  }

  // Preferir 51,2 V nominal litio cuando el título dice 48 V pero el modelo es FLA48…
  let vShow = vNum;
  if (
    Number.isFinite(vNum) &&
    Math.abs(vNum - 48) < 0.01 &&
    /\bFLA48|\b51[.,]2\s*V/i.test(texto)
  ) {
    vShow = 51.2;
  }

  if (Number.isFinite(vShow)) partes.push(`${formatDecimalToken(String(vShow))} V`);

  if (Number.isFinite(ahNum)) {
    partes.push(`${formatDecimalToken(String(ahNum))} Ah`);
  } else if (Number.isFinite(vShow) && vShow > 0 && Number.isFinite(kwhNum) && kwhNum > 0) {
    // Ah ≈ kWh × 1000 / V (usar 51,2 si el pack es litio 48 V nominal)
    const vCalc = Math.abs(vShow - 48) < 0.01 ? 51.2 : vShow;
    const estimado = (kwhNum * 1000) / vCalc;
    const redondeado =
      estimado >= 100 ? Math.round(estimado) : Math.round(estimado * 10) / 10;
    partes.push(`${formatDecimalToken(String(redondeado))} Ah`);
  }

  if (Number.isFinite(kwhNum)) partes.push(`${formatDecimalToken(String(kwhNum))} kWh`);
  return partes;
}

/**
 * Decodifica códigos Victron SCC… (SmartSolar / BlueSolar / PWM).
 * Ej.: SCC110015060R → 100 Voc · 15 A · 12/24 V
 */
function decodeVictronScc(modelOrTitle: string): { amp?: number; voc?: number; vbat?: string } | null {
  const u = norm(modelOrTitle).replace(/[^A-Z0-9]/g, '');
  const m = u.match(/\bSCC(\d{9,12})[A-Z]?\b/) || u.match(/SCC(\d{9,12})[A-Z]?/);
  if (!m) return null;
  const code = m[1];
  if (code.length < 9) return null;

  const head = parseInt(code.slice(0, 3), 10);
  const mid = parseInt(code.slice(3, 6), 10);
  if (!Number.isFinite(head) || !Number.isFinite(mid)) return null;

  // SmartSolar / BlueSolar MPPT: SCC + Voc-code(3) + Amps(3) + …
  // Voc-code: 075→75, 100→100, 110→100, 115→150, 125→250, 145→450, 010/020→100/200 BlueSolar
  const vocMap: Record<number, number> = {
    10: 100,
    20: 200,
    40: 48, // PWM 48V family often SCC040…
    75: 75,
    100: 100,
    110: 100,
    115: 150,
    125: 250,
    145: 450,
  };
  const voc = vocMap[head] ?? (head >= 50 && head <= 500 ? head : undefined);
  const amp = mid >= 1 && mid <= 250 ? mid : undefined;

  // Voltaje de batería habitual según familia Victron
  let vbat: string | undefined;
  if (head === 40 || (amp !== undefined && amp <= 30 && (voc === 75 || voc === 100))) {
    vbat = '12/24 V';
  } else if (voc === 150 || voc === 250 || voc === 450 || (amp !== undefined && amp >= 35)) {
    vbat = '12/24/48 V';
  } else if (voc) {
    vbat = '12/24 V';
  }

  if (amp === undefined && voc === undefined) return null;
  return { amp, voc, vbat };
}

/** Controlador: MPPT/PWM + amperaje + voltaje de batería. */
function metaControlador(title: string, power?: string, model?: string): string[] {
  const texto = `${title} ${power ?? ''} ${model ?? ''}`;
  const u = norm(texto);
  const partes: string[] = [];

  if (/\bMPPT\b/.test(u)) partes.push('MPPT');
  else if (/\bPWM\b/.test(u)) partes.push('PWM');

  const victron = decodeVictronScc(texto);
  let a = texto.match(/(\d+(?:[.,]\d+)?)\s*A\b/i);
  if (!a && victron?.amp) {
    partes.push(`${victron.amp} A`);
  } else if (a) {
    partes.push(`${formatDecimalToken(a[1])} A`);
  }

  // 12/24/48 V o Voc
  const vbat = texto.match(/\b(12\s*\/\s*24(?:\s*\/\s*48)?|12|24|48)\s*V\b/i);
  if (vbat) {
    partes.push(`${vbat[1].replace(/\s+/g, '')} V`);
  } else if (victron?.vbat) {
    partes.push(victron.vbat);
  } else {
    const voc = texto.match(/(\d+)\s*Voc\b/i);
    if (voc) partes.push(`${voc[1]} Voc`);
    else if (victron?.voc) partes.push(`${victron.voc} Voc`);
  }

  return partes;
}

/** Protección: Breaker / DPS / Fusible + polos + voltaje + AC/DC. */
function metaProteccion(title: string, power?: string): { tipo: string; partes: string[] } {
  const texto = `${title} ${power ?? ''}`;
  const u = norm(texto);

  let tipo = 'Protección';
  if (/\bDPS\b|SURGE|DESCARGADOR|SPD\b/.test(u)) tipo = 'DPS';
  else if (/\bFUSIBLE\b|FUSE\b|PORTAFUSIBLE/.test(u)) tipo = 'Fusible';
  else if (/\bBREAKER\b|INTERRUPTOR|MAGNETOTERM|MCB\b|MCCB\b|SCB/.test(u)) tipo = 'Breaker';
  else if (/\bSECCIONADOR\b|ISOLATOR|SWITCH\b/.test(u)) tipo = 'Seccionador';

  const partes: string[] = [];

  const polos =
    texto.match(/\b([1-4])\s*P\b/i) ||
    texto.match(/\b([1-4])\s*POLOS?\b/i) ||
    texto.match(/(\d)P\b/i) ||
    texto.match(/A(\d)P\b/i);
  if (polos) partes.push(`${polos[1]}P`);

  const amp = texto.match(/(\d+(?:[.,]\d+)?)\s*A\b/i);
  if (amp && tipo !== 'DPS') {
    partes.push(`${formatDecimalToken(amp[1])} A`);
  }

  const vac = texto.match(/(\d+(?:[.,]\d+)?)\s*V(?:ac|dc|AC|DC)?\b/);
  if (vac) {
    const esDc = /dc/i.test(vac[0]);
    const esAc = /ac/i.test(vac[0]);
    partes.push(`${formatDecimalToken(vac[1])} V${esDc ? ' DC' : esAc ? ' AC' : ''}`);
  } else {
    const va = texto.match(/(\d+(?:[.,]\d+)?)\s*VA\b/i);
    if (va) partes.push(`${formatDecimalToken(va[1])} VA`);
  }

  if (/\bDC\b|CONTINUA/.test(u) && !partes.some((p) => /DC/i.test(p))) partes.push('DC');
  else if (/\bAC\b|ALTERNA/.test(u) && !partes.some((p) => /AC/i.test(p))) partes.push('AC');

  return { tipo, partes };
}

/**
 * Primera línea de tarjeta (morado).
 * Ejemplos:
 *   Inversor On-Grid · 5 kW · Huawei
 *   Batería Litio · 12 V · 100 Ah · 14,3 kWh · Felicity
 *   Controlador · MPPT · 40 A · 12/24 V · EPever
 *   Breaker · 3P · 500 V · DC · Suntree
 */
export function formatTipoPotenciaLine(
  category: string,
  title: string,
  extra: MetaProductoLinea = {}
): string {
  const marca = marcaLimpia(extra.brand);
  const potencia =
    extractPowerOrCapacityLabel(title) ||
    extractPowerOrCapacityLabel(extra.model ?? '') ||
    potenciaDesdeCampo(extra.power);

  if (category === 'inversores') {
    const tipo = detectarTipoInversor(title, extra.model, extra.brand);
    const partes: string[] = [];
    if (tipo === 'Microinversor') {
      partes.push('Microinversor');
    } else {
      partes.push('Inversor');
      partes.push(tipo ?? 'On-Grid');
    }
    if (potencia) partes.push(potencia);
    if (marca) partes.push(marca);
    return partes.join(' · ');
  }

  if (category === 'baterias') {
    const partes = ['Batería Litio', ...metaBateria(title, extra.power, extra.model)];
    if (marca) partes.push(marca);
    return partes.join(' · ');
  }

  if (category === 'controladores') {
    const partes = ['Controlador', ...metaControlador(title, extra.power, extra.model)];
    if (marca) partes.push(marca);
    return partes.join(' · ');
  }

  if (category === 'protecciones') {
    const { tipo, partes: meta } = metaProteccion(title, extra.power);
    const partes = [tipo, ...meta];
    if (marca) partes.push(marca);
    return partes.join(' · ');
  }

  if (category === 'bombeo') {
    const partes = ['Bomba solar'];
    if (potencia) partes.push(potencia);
    if (marca) partes.push(marca);
    return partes.join(' · ');
  }

  if (category === 'reflectores') {
    const partes = ['Reflector solar'];
    if (potencia) partes.push(potencia);
    if (marca) partes.push(marca);
    return partes.join(' · ');
  }

  const tipo = compactCategoryLabel(category);
  const partes = [tipo];
  if (potencia) partes.push(potencia);
  if (marca && (category === 'paneles' || category === 'accesorios' || category === 'monitoreo' || category === 'cargadores')) {
    partes.push(marca);
  }
  return partes.join(' · ');
}

/** Categorías donde la marca ya va en la línea morada (no repetir en gris). */
export function marcaVaEnLineaMorada(category: string): boolean {
  return (
    category === 'inversores' ||
    category === 'baterias' ||
    category === 'controladores' ||
    category === 'protecciones' ||
    category === 'bombeo' ||
    category === 'reflectores' ||
    category === 'paneles'
  );
}

const ORDEN_TIPO_INVERSOR: Record<string, number> = {
  'On-Grid': 0,
  Microinversor: 0,
  'Off-Grid': 1,
  Híbrido: 2,
  Inversor: 9,
};

export function potenciaEnVatios(
  title: string,
  extra: MetaProductoLinea = {}
): number | null {
  const label =
    extractPowerOrCapacityLabel(title) ||
    extractPowerOrCapacityLabel(extra.model ?? '') ||
    potenciaDesdeCampo(extra.power);
  if (!label) return null;

  const m = label.match(/^([\d.,]+)\s*(kWh|kW|W|kWp)$/i);
  if (!m) return null;
  const valor = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(valor)) return null;
  const unidad = m[2].toLowerCase();
  if (unidad === 'kw' || unidad === 'kwp' || unidad === 'kwh') return Math.round(valor * 1000);
  return Math.round(valor);
}

export function ordenTipoInversor(
  title: string,
  model?: string,
  brand?: string
): number {
  const tipo = detectarTipoInversor(title, model, brand) ?? 'Inversor';
  return ORDEN_TIPO_INVERSOR[tipo] ?? 9;
}

export function ordenarInversoresPorTipoYPotencia<
  T extends { title: string; brand?: string; model?: string; power?: string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const oa = ordenTipoInversor(a.title, a.model, a.brand);
    const ob = ordenTipoInversor(b.title, b.model, b.brand);
    if (oa !== ob) return oa - ob;

    const pa = potenciaEnVatios(a.title, a) ?? Number.POSITIVE_INFINITY;
    const pb = potenciaEnVatios(b.title, b) ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;

    return a.title.localeCompare(b.title, 'es');
  });
}
