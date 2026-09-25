/**
 * Cotizaciones en Redis: precios congelados, CT-DDMMAA-###, token, vence 5 días hábiles.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRedis, waKey } from './whatsapp-redis.js';
import { calcTotalesConIvaIncluido, formatCopPdf, isExcluidoIva } from './iva.js';
import { formatPhoneCO } from './phone.js';
import { isFestivoColombia } from './festivos-co.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUOTE_TTL_SEC = 45 * 24 * 3600; // ~45 días (cubrir validez + margen)
const PREFIX = String(process.env.QUOTE_PREFIX || 'CT').trim() || 'CT';

const quotesMem = globalThis.__reikiQuotes || new Map();
globalThis.__reikiQuotes = quotesMem;
const seqMem = globalThis.__reikiQuoteSeq || new Map();
globalThis.__reikiQuoteSeq = seqMem;

let empresaCache = null;
export function loadEmpresa() {
  if (empresaCache) return empresaCache;
  const candidates = [
    path.join(process.cwd(), 'config', 'empresa.json'),
    path.join(__dirname, '..', '..', 'config', 'empresa.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        empresaCache = JSON.parse(fs.readFileSync(p, 'utf8'));
        return empresaCache;
      }
    } catch {
      /* next */
    }
  }
  empresaCache = {
    razon_social: 'Reiki Energía Solar SAS',
    nit: '901942389',
    direccion: 'Carrera 80 #39-167 Local 105',
    ciudad: 'Medellín, Antioquia',
    telefono: '+57 300 405 2638',
    whatsapp_url: 'https://wa.me/573004052638',
    correo: 'info@reikisolar.com.co',
    web: 'reikisolar.com.co',
    banco: {
      nombre: 'Bancolombia',
      tipo: 'ahorros',
      numero: '36600008477',
      llave_breb: '0089262235',
    },
    atencion: {
      telefono: '+57 324 573 7413',
      whatsapp_url: 'https://wa.me/573245737413',
    },
  };
  return empresaCache;
}

/** Fecha Bogotá DD/MM/YYYY */
export function fechaBogota() {
  return new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** DDMMAA Bogotá */
export function ddmmyyBogota(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return `${get('day')}${get('month')}${get('year')}`;
}

/** Suma N días hábiles (lun–vie, sin festivos CO) desde una fecha. */
export function addBusinessDays(fromDate, days) {
  const d = new Date(fromDate.getTime());
  let left = days;
  let guard = 0;
  while (left > 0 && guard < 120) {
    guard += 1;
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      weekday: 'short',
    }).format(d);
    if (wd === 'Sat' || wd === 'Sun') continue;
    if (isFestivoColombia(d)) continue;
    left -= 1;
  }
  return d;
}

export function validezLabel() {
  return '5 días hábiles, sujeto a disponibilidad';
}

async function nextConsecutive(dayKey) {
  const redis = getRedis();
  if (redis) {
    try {
      const n = await redis.incr(waKey('cotseq', dayKey));
      if (n === 1) await redis.expire(waKey('cotseq', dayKey), 3 * 24 * 3600);
      return n;
    } catch (err) {
      console.warn('[cotizacion-store] seq redis', err?.message || err);
    }
  }
  const cur = (seqMem.get(dayKey) || 0) + 1;
  seqMem.set(dayKey, cur);
  return cur;
}

export async function allocNumero() {
  const day = ddmmyyBogota();
  const n = await nextConsecutive(day);
  const num = `${PREFIX}-${day}-${String(n).padStart(3, '0')}`;
  return num;
}

function randomToken() {
  return crypto.randomBytes(16).toString('hex');
}

function randomId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Crea cotización con precios congelados.
 * @param {{ origen: string, cliente: object, items: object[], envio?: number|null, siteUrl?: string }} opts
 */
export async function createCotizacion(opts) {
  const empresa = loadEmpresa();
  const numero = await allocNumero();
  const id = randomId();
  const token = randomToken();
  const now = new Date();
  const vence = addBusinessDays(now, 5);
  const site = String(opts.siteUrl || 'https://reikisolar.com.co').replace(/\/$/, '');

  const items = (opts.items || []).map((it) => {
    const nombre = String(it.nombre || it.title || '');
    const categoria = String(it.categoria || it.category || '');
    const excluidoIva = isExcluidoIva({
      excluidoIva: it.excluidoIva,
      categoria,
      nombre,
    });
    return {
      id: it.id || it.slug || it.sku || '',
      sku: String(it.sku || ''),
      nombre,
      marca: String(it.marca || ''),
      cantidad: Number(it.cantidad || 1),
      precio_unit: Number(it.precio_unit ?? it.precioNum ?? 0),
      imagen: String(it.imagen || ''),
      url: String(it.url || ''),
      specs: Array.isArray(it.specs) ? it.specs.slice(0, 8) : [],
      potencia_w: it.potencia_w != null ? Number(it.potencia_w) : undefined,
      categoria,
      excluidoIva,
    };
  });

  const envio = opts.envio == null ? null : Number(opts.envio) || 0;
  const calc = calcTotalesConIvaIncluido(
    items.map((it) => ({
      price: it.precio_unit,
      quantity: it.cantidad,
      excluidoIva: it.excluidoIva,
      categoria: it.categoria,
      nombre: it.nombre,
    })),
    { envio }
  );

  const linkCompra = `${site}/carrito?cot=${id}&t=${token}`;
  const pdfUrl = `${site}/cotizacion/${id}.pdf?t=${token}`;

  const doc = {
    id,
    numero,
    token,
    fecha: fechaBogota(),
    fechaIso: now.toISOString(),
    origen: opts.origen || 'whatsapp',
    cliente: {
      nombre: String(opts.cliente?.nombre || '').trim(),
      ciudad: String(opts.cliente?.ciudad || '').trim(),
      celular: formatPhoneCO(opts.cliente?.celular || '') || String(opts.cliente?.celular || '').trim(),
      correo: String(opts.cliente?.correo || '').trim(),
      whatsappId: String(opts.cliente?.whatsappId || opts.cliente?.identificador || '').trim(),
    },
    items,
    envio,
    subtotal_excluido: calc.excluido,
    subtotal_base: calc.baseGravada,
    iva: calc.iva,
    total: calc.total,
    totalFmt: formatCopPdf(calc.total),
    estado: 'cotizada',
    venceIso: vence.toISOString(),
    validez: validezLabel(),
    canal: opts.origen === 'web' ? 'Web' : 'WhatsApp',
    asesor: 'Equipo comercial Reiki',
    link_compra: linkCompra,
    pdfUrl,
    hsp_ciudad: 4.5,
    pr: 0.78,
    empresa,
  };

  quotesMem.set(id, doc);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(waKey('cot', id), doc, { ex: QUOTE_TTL_SEC });
    } catch (err) {
      console.warn('[cotizacion-store] set', err?.message || err);
    }
  }
  return doc;
}

export async function getCotizacion(id) {
  const key = String(id || '').trim();
  if (!key) return null;
  if (quotesMem.has(key)) return quotesMem.get(key);
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(waKey('cot', key));
      if (raw && typeof raw === 'object') {
        quotesMem.set(key, raw);
        return raw;
      }
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        quotesMem.set(key, parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('[cotizacion-store] get', err?.message || err);
    }
  }
  return null;
}

export async function getCotizacionIfToken(id, token) {
  const doc = await getCotizacion(id);
  if (!doc) return null;
  if (String(doc.token || '') !== String(token || '').trim()) return null;
  return doc;
}

export async function updateCotizacionEstado(id, estado, extra = {}) {
  const doc = await getCotizacion(id);
  if (!doc) return null;
  doc.estado = estado;
  Object.assign(doc, extra);
  quotesMem.set(id, doc);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(waKey('cot', id), doc, { ex: QUOTE_TTL_SEC });
    } catch {
      /* ignore */
    }
  }
  return doc;
}

export function isCotizacionVencida(doc) {
  if (!doc?.venceIso) return false;
  return new Date(doc.venceIso).getTime() < Date.now();
}

/** Guarda índice referencia de pago → cotización id */
export async function linkPaymentReference(reference, cotizacionId) {
  const ref = String(reference || '').trim();
  const id = String(cotizacionId || '').trim();
  if (!ref || !id) return;
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(waKey('cotref', ref), id, { ex: QUOTE_TTL_SEC });
    } catch (err) {
      console.warn('[cotizacion-store] cotref', err?.message || err);
    }
  }
}

export async function getCotizacionIdByPaymentRef(reference) {
  const ref = String(reference || '').trim();
  if (!ref) return null;
  // Formato cot-{id}-… embebido
  const m = ref.match(/^cot-([a-f0-9]+)-/i);
  if (m) return m[1];
  const redis = getRedis();
  if (redis) {
    try {
      const id = await redis.get(waKey('cotref', ref));
      if (id) return String(id);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Datos listos para renderCotizacionHtml */
export function toRenderPayload(doc, assetBase) {
  return {
    empresa: doc.empresa || loadEmpresa(),
    cotizacion: {
      numero: doc.numero,
      fecha: doc.fecha,
      validez: doc.validez || validezLabel(),
      canal: doc.canal || 'WhatsApp',
      asesor: doc.asesor || 'Equipo comercial Reiki',
      link_compra: doc.link_compra,
      hsp_ciudad: doc.hsp_ciudad ?? 4.5,
      pr: doc.pr ?? 0.78,
    },
    cliente: doc.cliente,
    items: doc.items,
    envio: doc.envio,
    assetBase: assetBase || 'https://reikisolar.com.co',
  };
}
