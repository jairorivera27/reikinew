/**
 * Peso y medidas de la caja de cada equipo, para cotizar el flete sin que nadie tenga que medir.
 * 1) Si la ficha de la tienda trae peso/dimensiones (data/empaques-productos.json), se usan + empaque.
 * 2) Si no, se estima por tipo de equipo y su potencia/capacidad (W, kW, kWh, Ah) con valores típicos de empaque.
 * Son estimaciones: la transportadora puede reliquidar si el peso real es mayor.
 */
import fs from 'node:fs';
import path from 'node:path';

let fichas = null;
function fichasProductos() {
  if (fichas) return fichas;
  try {
    fichas = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'empaques-productos.json'), 'utf8'));
  } catch {
    fichas = {};
  }
  return fichas;
}

const num = (re, t) => {
  const m = re.exec(t);
  return m ? Number(String(m[1]).replace(',', '.')) : 0;
};
const sin = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Caja de UNA unidad: { peso (kg), largo, ancho, alto (cm), fuente, agrupable } */
export function cajaDeEquipo({ nombre, sku, categoria } = {}) {
  const f = fichasProductos()[String(sku || '')];
  if (f && f.peso) {
    const d = f.largo ? [f.largo + 6, f.ancho + 6, f.alto + 6] : null;
    return { peso: Math.round(f.peso * 1.1 * 10) / 10, largo: d ? Math.round(d[0]) : 50, ancho: d ? Math.round(d[1]) : 40, alto: d ? Math.round(d[2]) : 30, fuente: 'ficha', agrupable: f.peso < 3 };
  }
  const t = sin(`${nombre} ${categoria || ''} ${sku || ''}`);
  const W = num(/(\d{2,4})\s*w\b/, t);
  const kW = num(/(\d+(?:[.,]\d+)?)\s*kw\b/, t) || (W >= 1000 ? W / 1000 : 0);
  const kWh = num(/(\d+(?:[.,]\d+)?)\s*kwh/, t);
  const Ah = num(/(\d{2,4})\s*ah\b/, t);
  const c = (peso, largo, ancho, alto, agrupable = false) => ({ peso, largo, ancho, alto, fuente: 'estimado', agrupable });

  if (/panel|modulo|bifacial/.test(t) && !/tablero|panel de control/.test(t)) {
    if (W >= 600) return c(37, 240, 135, 6);
    if (W >= 450) return c(30, 228, 115, 6);
    if (W >= 200) return c(22, 180, 113, 5);
    if (W >= 80) return c(9, 120, 70, 5);
    return c(5, 80, 55, 5);
  }
  if (/micro ?inversor|microinversor/.test(t)) return c(kW >= 1.5 ? 6 : 4, 40, 30, 12);
  if (/bateria|battery/.test(t)) {
    if (/litio|lifepo|lithium/.test(t) || kWh) {
      const e = kWh || (Ah ? (Ah * (num(/(\d{2})\s*v\b/, t) || 12)) / 1000 : 2.5);
      const peso = Math.round(e * 10.5 + 5);
      if (e <= 1.5) return c(peso, 40, 25, 25);
      if (e <= 3) return c(peso, 52, 42, 25);
      if (e <= 6) return c(peso, 65, 50, 28);
      if (e <= 11) return c(peso, 78, 55, 32);
      return c(peso, 90, 65, 38);
    }
    const ah = Ah || 100;
    return c(Math.round(ah * 0.3), ah > 150 ? 55 : 38, ah > 150 ? 28 : 20, 28);
  }
  if (/inversor|inverter/.test(t)) {
    const p = kW || 5;
    if (p <= 1.5) return c(8, 45, 35, 20);
    if (p <= 3.5) return c(13, 52, 42, 22);
    if (p <= 6.5) return c(21, 62, 48, 26);
    if (p <= 12) return c(30, 72, 55, 30);
    if (p <= 30) return c(55, 82, 62, 36);
    return c(85, 95, 72, 42);
  }
  if (/controlador|regulador|mppt|pwm/.test(t)) {
    const a = num(/(\d{2,3})\s*a\b/, t);
    return a >= 60 ? c(6, 42, 32, 20) : c(2.5, 30, 22, 14, true);
  }
  if (/medidor|meter|dtsu|dtu|wifi|datalogger|monitoreo|gateway|tc\b|transformador de corriente/.test(t)) return c(1, 25, 20, 12, true);
  if (/breaker|dps|fusible|portafusible|supresor|interruptor|seccionador|totalizador|proteccion/.test(t)) return c(0.6, 20, 15, 10, true);
  if (/cable/.test(t)) return c(3, 35, 35, 15, true);
  if (/conector|mc4|terminal|tapa|herramienta|abrazadera|grapa|tornillo|clamp|accesorio/.test(t)) return c(0.4, 20, 15, 8, true);
  if (/estructura|riel|perfil/.test(t)) return c(8, 230, 15, 12);
  if (/reflector|lampara|luminaria/.test(t)) return c(W >= 200 ? 6 : 3, 50, 40, 15);
  if (/bomba|bombeo/.test(t)) return c(18, 70, 30, 30);
  if (/aire acondicionado|minisplit/.test(t)) return c(45, 100, 45, 40);
  return c(5, 40, 30, 30);
}

/**
 * Cajas para un grupo de ítems de venta [{ nombre, sku, cantidad }]: una línea por equipo grande
 * y los accesorios pequeños juntos en una caja.
 */
export function cajasParaItems(items = []) {
  const cajas = [];
  let accPeso = 0;
  const accNombres = [];
  for (const it of items) {
    const n = Math.max(1, Math.round(Number(it.cantidad) || 1));
    const k = cajaDeEquipo(it);
    if (k.agrupable) {
      accPeso += k.peso * n;
      accNombres.push(it.nombre);
      continue;
    }
    cajas.push({ contenido: String(it.nombre || 'Equipo').slice(0, 50), cantidad: n, peso: k.peso, largo: k.largo, ancho: k.ancho, alto: k.alto, fuente: k.fuente });
  }
  if (accNombres.length) {
    const p = Math.max(1, Math.round(accPeso * 1.15 * 10) / 10);
    const g = p > 10 ? [50, 40, 35] : p > 4 ? [40, 30, 25] : [30, 25, 15];
    cajas.push({ contenido: accNombres.length === 1 ? accNombres[0].slice(0, 50) : `Accesorios y protecciones (${accNombres.length})`, cantidad: 1, peso: p, largo: g[0], ancho: g[1], alto: g[2], fuente: 'estimado' });
  }
  return cajas;
}
