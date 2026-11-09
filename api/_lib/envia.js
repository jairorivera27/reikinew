/**
 * Envia.com (envíos con transportadoras de Colombia) desde el panel:
 * cotizar el flete con varias transportadoras, comprar la guía, pedir la recogida y rastrear.
 *
 * Variables en Vercel: ENVIA_TOKEN (token de Envia → Developers → API Keys) y ENVIA_ENTORNO
 * ("produccion" para guías reales; cualquier otro valor o vacío = sandbox de pruebas).
 * Cada token sirve solo en su entorno: el de sandbox no funciona en producción.
 *
 * Las bodegas de despacho (origen de los envíos, normalmente la bodega del proveedor) se guardan en Redis,
 * no en el repositorio (es público).
 */
import { getRedis, waKey } from './whatsapp-redis.js';
import { ubicacionOficial } from './validar-cliente.js';

function cfg() {
  const prod = /^prod/i.test(String(process.env.ENVIA_ENTORNO || '').trim());
  return {
    token: String(process.env.ENVIA_TOKEN || '').trim(),
    prod,
    api: prod ? 'https://api.envia.com' : 'https://api-test.envia.com',
    queries: prod ? 'https://queries.envia.com' : 'https://queries.test.envia.com',
  };
}

export function enviaConfigurado() {
  return Boolean(cfg().token);
}
export function enviaEntorno() {
  return cfg().prod ? 'produccion' : 'pruebas';
}

async function llamar(base, method, ruta, body, auth = true) {
  const c = cfg();
  if (auth && !c.token) throw new Error('Envia no está conectado: falta ENVIA_TOKEN en Vercel.');
  const res = await fetch(`${base}${ruta}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(auth ? { Authorization: `Bearer ${c.token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let j = null;
  try {
    j = txt ? JSON.parse(txt) : null;
  } catch {
    j = { raw: txt };
  }
  const err = j && (j.meta === 'error' || j.error) ? j.error || j : null;
  if (!res.ok || err) {
    const m = (err && (err.message || err.description)) || (j && j.message) || txt || `HTTP ${res.status}`;
    throw new Error(`Envia ${res.status}: ${String(typeof m === 'string' ? m : JSON.stringify(m)).slice(0, 300)}`);
  }
  return j;
}
const api = (method, ruta, body) => llamar(cfg().api, method, ruta, body);
const queries = (method, ruta, body) => llamar(cfg().queries, method, ruta, body);

/* ---------------- ciudades (código DANE) ---------------- */
const DEPTOS = {
  amazonas: 'AM', antioquia: 'AN', arauca: 'AR', atlantico: 'AT', 'bogota, d.c.': 'DC', bogota: 'DC', bolivar: 'BL', boyaca: 'BY',
  caldas: 'CL', caqueta: 'CA', casanare: 'CS', cauca: 'CU', cesar: 'CE', choco: 'CH', cordoba: 'CO', cundinamarca: 'CN',
  guainia: 'GU', guaviare: 'GA', huila: 'HU', 'la guajira': 'LG', magdalena: 'MA', meta: 'ME', narino: 'NA',
  'norte de santander': 'NS', putumayo: 'PU', quindio: 'QU', risaralda: 'RI', 'san andres y providencia': 'SA',
  'archipielago de san andres, providencia y santa catalina': 'SA', santander: 'SN', sucre: 'SU', tolima: 'TO',
  'valle del cauca': 'VC', vaupes: 'VA', vichada: 'VI',
};
const sinTildes = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const cacheCiudad = new Map();
/** "Girardot, Cundinamarca" → { city: '25307000', state: 'CN', postalCode: '25307000', nombre: 'Girardot' } */
export async function ciudadEnvia(ciudad) {
  const u = ubicacionOficial(ciudad);
  if (!u.city || !u.department) throw new Error(`Ciudad sin departamento: "${ciudad}". Escríbela como "Municipio, Departamento".`);
  const state = DEPTOS[sinTildes(u.department)];
  if (!state) throw new Error(`No reconozco el departamento "${u.department}".`);
  const nombre = state === 'DC' ? 'Bogota' : sinTildes(u.city).replace(/,.*$/, '');
  const k = `${nombre}|${state}`;
  if (cacheCiudad.has(k)) return cacheCiudad.get(k);
  const j = await llamar(cfg().api, 'POST', '/locate', { city: nombre, state, country: 'CO' }, false);
  if (!j || !j.city) throw new Error(`Envia no encontró la ciudad "${u.city}, ${u.department}".`);
  const r = { city: String(j.city), state: j.state || state, postalCode: String(j.city), nombre: u.city };
  cacheCiudad.set(k, r);
  return r;
}

/* ---------------- bodegas de despacho ---------------- */
const KEY_BODEGAS = waKey('despacho', 'bodegas');
let memBodegas = globalThis.__reikiBodegas || null;

export async function leerBodegas() {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(KEY_BODEGAS);
      if (raw) memBodegas = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      console.warn('[envia] bodegas', err?.message || err);
    }
  }
  return memBodegas || {};
}

const s = (v, n = 160) => String(v ?? '').trim().slice(0, n);
/** bodegas: { id: { nombre, empresa, contacto, telefono, correo, direccion, ciudad, nit, proveedor, horario } } — null borra. */
export async function guardarBodegas(input = {}) {
  const out = { ...(await leerBodegas()) };
  for (const [id0, b] of Object.entries(input || {})) {
    const id = s(id0, 40).toLowerCase().replace(/[^a-z0-9-]+/g, '-') || `b${Date.now()}`;
    if (!b) {
      delete out[id];
      continue;
    }
    out[id] = {
      nombre: s(b.nombre, 80),
      empresa: s(b.empresa, 80) || 'Reiki Energía Solar SAS',
      contacto: s(b.contacto, 80),
      telefono: s(b.telefono, 20).replace(/[^\d+]/g, ''),
      correo: s(b.correo, 120),
      direccion: s(b.direccion, 160),
      ciudad: s(b.ciudad, 80),
      nit: s(b.nit, 20) || '901942389',
      proveedor: s(b.proveedor, 80),
      horario: s(b.horario, 80),
    };
  }
  memBodegas = out;
  globalThis.__reikiBodegas = out;
  const redis = getRedis();
  if (redis) await redis.set(KEY_BODEGAS, out);
  return out;
}

/* ---------------- direcciones y paquetes ---------------- */
async function direccion({ nombre, empresa, telefono, correo, calle, ciudad, documento, referencia }) {
  const c = await ciudadEnvia(ciudad);
  return {
    name: s(nombre, 60) || s(empresa, 60) || 'Cliente',
    company: s(empresa, 60) || undefined,
    email: s(correo, 120) || undefined,
    phone: String(telefono || '').replace(/\D/g, '').slice(-10),
    phone_code: 'CO',
    street: s(calle, 120),
    number: '',
    district: '',
    city: c.city,
    state: c.state,
    country: 'CO',
    postalCode: c.postalCode,
    reference: s(referencia, 120) || undefined,
    identificationNumber: String(documento || '').replace(/[^\d-]/g, '') || undefined,
    category: 1,
  };
}

export async function origenDe(bodega) {
  if (!bodega) throw new Error('Escoge la bodega de donde sale el envío.');
  return direccion({ nombre: bodega.contacto || bodega.nombre, empresa: bodega.empresa, telefono: bodega.telefono, correo: bodega.correo, calle: bodega.direccion, ciudad: bodega.ciudad, documento: bodega.nit, referencia: bodega.nombre });
}

export async function destinoDe(exp) {
  const cl = exp.cliente || {};
  const recibe = String(cl.contacto || '').replace(/^Recibe:\s*/i, '');
  const telRecibe = (recibe.match(/(\+?57)?\s*3\d{2}\s*\d{3}\s*\d{4}/) || [])[0];
  if (!cl.direccion) throw new Error('La venta no tiene dirección de entrega.');
  return direccion({
    nombre: recibe ? recibe.split(/[,·]/)[0] : cl.nombre,
    empresa: cl.nombre,
    telefono: telRecibe || cl.celular,
    correo: cl.correo,
    calle: cl.direccion,
    ciudad: cl.ciudad,
    documento: cl.documento,
  });
}

/** paquetes: [{ contenido, cantidad, peso (kg), largo, ancho, alto (cm), valor }] */
export function paquetesEnvia(paquetes = []) {
  const out = (paquetes || [])
    .map((p) => ({
      type: 'box',
      content: s(p.contenido, 60) || 'Equipos solares',
      amount: Math.max(1, Math.round(Number(p.cantidad) || 1)),
      name: s(p.contenido, 40) || 'Caja',
      declaredValue: Math.max(0, Math.round(Number(p.valor) || 0)),
      lengthUnit: 'CM',
      weightUnit: 'KG',
      weight: Math.max(0.1, Number(p.peso) || 0),
      dimensions: { length: Math.max(1, Number(p.largo) || 0), width: Math.max(1, Number(p.ancho) || 0), height: Math.max(1, Number(p.alto) || 0) },
    }))
    .filter((p) => p.weight > 0.1 && p.dimensions.length > 1);
  if (!out.length) throw new Error('Agrega al menos una caja con peso y medidas.');
  return out;
}

/* ---------------- transportadoras ---------------- */
const CARRIERS_CO = ['coordinadora', 'servientrega', 'interrapidisimo', 'tcc', 'deprisa'];
let carriersCache = null;
export async function transportadoras() {
  if (carriersCache) return carriersCache;
  try {
    const j = await queries('GET', '/carrier?country_code=CO');
    const lista = (j?.data || []).map((c) => String(c.name || '').toLowerCase()).filter(Boolean);
    const nac = lista.filter((n) => !['dhl', 'fedex', 'ups'].includes(n));
    carriersCache = nac.length ? [...new Set(nac)] : CARRIERS_CO;
  } catch {
    carriersCache = CARRIERS_CO;
  }
  return carriersCache;
}

/** Cotiza con todas las transportadoras nacionales; devuelve las tarifas ordenadas por precio y los errores por transportadora. */
export async function cotizar({ origen, destino, paquetes }) {
  const carriers = await transportadoras();
  const res = await Promise.allSettled(
    carriers.map((carrier) =>
      api('POST', '/ship/rate/', { origin: origen, destination: destino, packages: paquetes, settings: { currency: 'COP' }, shipment: { type: 1, carrier } })
    )
  );
  const tarifas = [];
  const errores = [];
  res.forEach((r, i) => {
    if (r.status === 'rejected') {
      errores.push({ carrier: carriers[i], error: String(r.reason?.message || r.reason).slice(0, 200) });
      return;
    }
    for (const t of r.value?.data || []) {
      tarifas.push({
        carrier: t.carrier,
        carrierNombre: t.carrierDescription || t.carrier,
        service: t.service,
        servicio: t.serviceDescription || t.service,
        precio: Math.round(Number(t.totalPrice) || 0),
        moneda: t.currency || 'COP',
        entrega: t.deliveryEstimate || '',
        fechaEntrega: t.deliveryDate?.date || '',
        recogida: !t.dropOff,
      });
    }
  });
  tarifas.sort((a, b) => a.precio - b.precio);
  return { tarifas, errores, entorno: enviaEntorno() };
}

/** Compra la guía. Devuelve { guia, trackUrl, label, precio, saldo, shipmentId, carrier, service }. */
export async function generarGuia({ origen, destino, paquetes, carrier, service, referencia, comentario }) {
  const j = await api('POST', '/ship/generate/', {
    origin: origen,
    destination: destino,
    packages: paquetes,
    settings: { currency: 'COP', printFormat: 'PDF', printSize: 'PAPER_4X6', comments: s(comentario, 120) || undefined },
    shipment: { type: 1, carrier, service, orderReference: s(referencia, 40) || undefined },
  });
  const d = (j?.data || [])[0];
  if (!d || !d.trackingNumber) throw new Error('Envia no devolvió número de guía.');
  return {
    guia: String(d.trackingNumber),
    trackUrl: d.trackUrl || '',
    label: d.label || '',
    precio: Math.round(Number(d.totalPrice) || 0),
    saldo: d.currentBalance != null ? Number(d.currentBalance) : null,
    shipmentId: d.shipmentId || null,
    carrier: d.carrier || carrier,
    service: d.service || service,
  };
}

/** Pide la recogida en la bodega. fecha 'YYYY-MM-DD', horas enteras (9–17). */
export async function pedirRecogida({ origen, carrier, guias, fecha, desde = 9, hasta = 17, pesoTotal, paquetes, instrucciones }) {
  const j = await api('POST', '/ship/pickup/', {
    origin: origen,
    shipment: {
      type: 1,
      carrier,
      pickup: {
        weightUnit: 'KG',
        totalWeight: Math.max(0.1, Number(pesoTotal) || 1),
        totalPackages: Math.max(1, Number(paquetes) || 1),
        date: fecha,
        timeFrom: Number(desde) || 9,
        timeTo: Number(hasta) || 17,
        carrier,
        instructions: s(instrucciones, 120) || undefined,
        trackingNumbers: guias,
      },
    },
    settings: { currency: 'COP' },
  });
  const d = Array.isArray(j?.data) ? j.data[0] : j?.data;
  return { confirmacion: String(d?.confirmation || d?.pickupNumber || d?.folio || ''), raw: d || null };
}

const ESTADOS_ENTREGADO = /deliver|entreg/i;
/** Estado actual de una o varias guías. */
export async function rastrear(guias = []) {
  const j = await api('POST', '/ship/generaltrack/', { trackingNumbers: guias });
  return (j?.data || []).map((t) => ({
    guia: String(t.trackingNumber || ''),
    estado: t.status || '',
    entregado: ESTADOS_ENTREGADO.test(String(t.status || '')),
    fecha: t.deliveredAt || t.updatedAt || '',
    eventos: (t.eventHistory || t.events || []).slice(-6).map((e) => ({ fecha: e.date || e.datetime || '', texto: e.description || e.event || '', lugar: e.location || '' })),
  }));
}
