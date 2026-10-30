/**
 * Cotizaciones de Reiki: registro desde cualquier chat de Claude, envío al cliente,
 * seguimiento y paso a venta (expediente) cuando se acepta.
 *
 * Estados: por_enviar → enviada → seguimiento → aceptada | rechazada
 * Persistencia: Upstash Redis. El PDF se guarda en trozos (Redis limita el tamaño por valor).
 */
import crypto from 'node:crypto';
import { getRedis, waKey } from './whatsapp-redis.js';
import { saveExpediente, getExpediente, actualizarCompras } from './seguimiento.js';
import { enviarConAdjunto } from './correos.js';

export const ESTADOS_COT = ['por_enviar', 'enviada', 'seguimiento', 'aceptada', 'rechazada'];
const IDX = waKey('cotzidx', 'all');
const mem = globalThis.__reikiCot || new Map();
globalThis.__reikiCot = mem;
const pdfMem = globalThis.__reikiCotPdf || new Map();
globalThis.__reikiCotPdf = pdfMem;
const TROZO = 600 * 1024; // caracteres base64 por clave de Redis
const MAX_PDF = 12 * 1024 * 1024; // bytes

const str = (v, n = 400) => String(v == null ? '' : v).trim().slice(0, n);
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : 0;
  const n = Number(String(v || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
};
const nowIso = () => new Date().toISOString();
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
export function sumarDias(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  // si cae en domingo, pasa a lunes
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** "Cot -141026001", "CT-271026-006 R1" → id estable sin la revisión: "COT141026001", "CT271026006". */
export function idDeNumero(numero) {
  const base = String(numero || '')
    .toUpperCase()
    .replace(/\bR(EV)?\.?\s*\d+\s*$/, '')
    .replace(/[^A-Z0-9]/g, '');
  return base.slice(0, 40);
}
function revisionDe(numero) {
  const m = String(numero || '').match(/\bR(?:EV)?\.?\s*(\d+)\s*$/i);
  return m ? Number(m[1]) : 0;
}

const key = (id) => waKey('cotz', id);
const pdfKey = (id, n) => waKey('cotzpdf', `${id}:${n}`);

function pushHist(c, by, texto) {
  c.historial = [{ at: nowIso(), by: str(by, 40) || 'panel', texto: str(texto, 300) }, ...(c.historial || [])].slice(0, 80);
}

async function persist(c) {
  c.updatedAt = nowIso();
  mem.set(c.id, c);
  const redis = getRedis();
  if (redis) {
    await redis.set(key(c.id), c);
    await redis.sadd(IDX, c.id);
  }
  return c;
}

export async function getCotizacion(id) {
  const k = str(id, 60);
  if (!k) return null;
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(key(k));
      if (raw) {
        const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
        mem.set(k, v);
        return v;
      }
    } catch (err) {
      console.warn('[cotizaciones] get', err?.message || err);
    }
  }
  return mem.get(k) || null;
}

export async function listCotizaciones() {
  const redis = getRedis();
  let ids = [];
  if (redis) {
    try {
      ids = (await redis.smembers(IDX)) || [];
    } catch (err) {
      console.warn('[cotizaciones] smembers', err?.message || err);
    }
  }
  if (!ids.length) ids = Array.from(mem.keys());
  const out = [];
  if (redis && ids.length) {
    for (let i = 0; i < ids.length; i += 100) {
      const lote = ids.slice(i, i + 100);
      const vals = await redis.mget(...lote.map(key));
      vals.forEach((raw) => {
        if (raw) out.push(typeof raw === 'string' ? JSON.parse(raw) : raw);
      });
    }
  } else {
    for (const id of ids) {
      const c = mem.get(id);
      if (c) out.push(c);
    }
  }
  out.sort((a, b) => String(b.creada).localeCompare(String(a.creada)));
  return out;
}

function normItem(it) {
  return {
    nombre: str(it.nombre || it.name || it.title, 300),
    sku: str(it.sku || it.slug, 200),
    cantidad: Math.max(1, num(it.cantidad ?? it.quantity ?? 1)),
    precioUnit: num(it.precioUnit ?? it.precio ?? it.unitPrice ?? it.price),
    costoUnit: num(it.costoUnit ?? it.costo ?? 0),
    proveedor: str(it.proveedor, 80),
    categoria: str(it.categoria || it.category, 60),
    // false = servicio, envío, mano de obra, RETIE…: no se le compra a un proveedor
    comprar: it.comprar === false ? false : true,
  };
}

/** Resumen calculado (no se guarda). */
export function resumenCot(c) {
  const h = hoy();
  const prox = c.proximoSeguimiento || '';
  const abierta = ['por_enviar', 'enviada', 'seguimiento'].includes(c.estado);
  const ultimoEnvio = (c.envios || []).find((e) => e.estado === 'enviado');
  return {
    abierta,
    seguimientoVencido: abierta && c.estado !== 'por_enviar' && prox && prox <= h,
    diasDesdeEnvio: ultimoEnvio ? Math.floor((Date.now() - Date.parse(ultimoEnvio.at)) / 86400000) : null,
    ultimoEnvio: ultimoEnvio ? ultimoEnvio.at : null,
    tienePdf: Boolean((c.pdf && c.pdf.partes) || c.pdfUrl),
    contactos: (c.seguimientos || []).length,
  };
}
export const conResumenCot = (c) => ({ ...c, resumen: resumenCot(c) });

/**
 * Crea o actualiza (por número; una revisión "R1" actualiza la misma cotización).
 * Campos: numero, tipo ('equipos'|'proyecto'), fecha, validez, titulo, descripcion, cliente{...},
 * total, subtotal, iva, items[], condicionesPago, estado, proximoSeguimiento, notas, chat
 */
export async function guardarCotizacion(input = {}, by = 'panel') {
  const numero = str(input.numero, 60);
  const id = str(input.id, 60) || idDeNumero(numero);
  if (!id) throw new Error('numero obligatorio');
  const prev = await getCotizacion(id);
  const c = prev
    ? { ...prev }
    : {
        id,
        estado: 'por_enviar',
        creada: nowIso(),
        envios: [],
        seguimientos: [],
        historial: [],
        origen: str(input.origen, 30) || (by === 'panel' ? 'panel' : 'chat'),
      };
  const rev = revisionDe(numero);
  if (numero) {
    if (prev && prev.numero && prev.numero !== numero) pushHist(c, by, `Nueva versión: ${prev.numero} → ${numero}`);
    c.numero = numero;
    c.revision = rev;
  }
  if (input.tipo) c.tipo = input.tipo === 'proyecto' ? 'proyecto' : 'equipos';
  if (!c.tipo) c.tipo = 'equipos';
  for (const f of ['fecha', 'validez', 'titulo', 'descripcion', 'condicionesPago', 'notas', 'chat', 'pdfUrl', 'linkCompra', 'canal', 'webId']) {
    if (input[f] !== undefined) c[f] = str(input[f], f === 'notas' || f === 'descripcion' ? 2000 : 300);
  }
  if (input.cliente) {
    const x = input.cliente;
    c.cliente = {
      ...(c.cliente || {}),
      ...Object.fromEntries(
        ['nombre', 'documento', 'tipoDoc', 'ciudad', 'direccion', 'celular', 'correo', 'contacto']
          .filter((f) => x[f] !== undefined && x[f] !== null)
          .map((f) => [f, str(x[f], 200)])
      ),
    };
  }
  if (input.total !== undefined) c.total = num(input.total);
  if (input.subtotal !== undefined) c.subtotal = num(input.subtotal);
  if (input.iva !== undefined) c.iva = num(input.iva);
  if (Array.isArray(input.items)) c.items = input.items.map(normItem).filter((i) => i.nombre);
  if (input.envio && (input.envio.precio || input.envio.valor)) {
    c.items = (c.items || []).filter((i) => !/^env[ií]o/i.test(i.nombre));
    c.items.push(normItem({ nombre: `Envío ${str(input.envio.ruta || '', 100)}`.trim(), cantidad: 1, precio: input.envio.precio || input.envio.valor, comprar: false }));
  }
  if (!c.titulo) c.titulo = [c.cliente?.nombre, c.descripcion].filter(Boolean).join(' · ').slice(0, 200) || c.numero || id;
  if (input.estado && ESTADOS_COT.includes(input.estado) && input.estado !== c.estado) {
    c.estado = input.estado;
    pushHist(c, by, `Estado → ${input.estado}`);
  }
  if (input.proximoSeguimiento !== undefined) c.proximoSeguimiento = str(input.proximoSeguimiento, 10);
  if (input.expedienteId) c.expedienteId = str(input.expedienteId, 60);
  if (input.creada && !prev) c.creada = str(input.creada, 30);
  pushHist(c, by, prev ? `Cotización actualizada${numero ? ` (${numero})` : ''}.` : `Cotización registrada${c.origen === 'chat' ? ' desde un chat de Claude' : ''}.`);
  return persist(c);
}

/* ---------------- PDF en trozos ---------------- */

/**
 * Recibe el PDF en base64 (completo o por partes para no pasar el límite de 4,5 MB por petición).
 * parte: 1..total. Cuando llega la última, el PDF queda disponible.
 */
export async function guardarPdfParte(id, { nombre, base64, parte = 1, total = 1 } = {}, by = 'panel') {
  const c = await getCotizacion(id);
  if (!c) return null;
  const datos = String(base64 || '').replace(/^data:application\/pdf;base64,/, '').replace(/\s/g, '');
  if (!datos) throw new Error('pdf vacío');
  const p = Math.max(1, num(parte));
  const t = Math.max(1, num(total));
  const redis = getRedis();
  // cada parte recibida se divide en trozos de Redis: cotpdf:<id>:<parte>.<n>
  const trozos = Math.ceil(datos.length / TROZO);
  for (let i = 0; i < trozos; i += 1) {
    const val = datos.slice(i * TROZO, (i + 1) * TROZO);
    if (redis) await redis.set(pdfKey(id, `nuevo.${p}.${i}`), val);
    else pdfMem.set(`${id}:nuevo.${p}.${i}`, val);
  }
  c.pdfCarga = { ...(c.pdfCarga || {}), [p]: trozos, total: t, nombre: str(nombre, 160) || (c.pdfCarga && c.pdfCarga.nombre) || '' };
  const recibidas = Object.keys(c.pdfCarga).filter((k) => /^\d+$/.test(k)).length;
  if (recibidas >= t) {
    // consolidar: lista ordenada de claves de trozos
    const claves = [];
    for (let i = 1; i <= t; i += 1) for (let j = 0; j < (c.pdfCarga[i] || 0); j += 1) claves.push(`nuevo.${i}.${j}`);
    // copiar a claves definitivas y borrar las del PDF anterior
    const anteriores = (c.pdf && c.pdf.claves) || [];
    const definitivas = [];
    let largo = 0;
    for (let k = 0; k < claves.length; k += 1) {
      const val = redis ? await redis.get(pdfKey(id, claves[k])) : pdfMem.get(`${id}:${claves[k]}`);
      const sufijo = `v${Date.now().toString(36)}.${k}`;
      if (redis) {
        await redis.set(pdfKey(id, sufijo), val);
        await redis.del(pdfKey(id, claves[k]));
      } else {
        pdfMem.set(`${id}:${sufijo}`, val);
        pdfMem.delete(`${id}:${claves[k]}`);
      }
      largo += String(val || '').length;
      definitivas.push(sufijo);
    }
    const bytes = Math.floor((largo * 3) / 4);
    if (bytes > MAX_PDF) throw new Error('PDF demasiado grande (máx. 12 MB)');
    for (const a of anteriores) {
      if (redis) await redis.del(pdfKey(id, a));
      else pdfMem.delete(`${id}:${a}`);
    }
    c.pdf = { nombre: c.pdfCarga.nombre || `${c.numero || id}.pdf`, bytes, claves: definitivas, partes: definitivas.length, subido: nowIso(), version: c.numero || id };
    delete c.pdfCarga;
    pushHist(c, by, `PDF cargado (${Math.round(bytes / 1024)} KB).`);
  }
  await persist(c);
  return { cot: c, completo: recibidas >= t, recibidas, total: t };
}

export async function leerPdf(id) {
  const c = await getCotizacion(id);
  if (!c) return null;
  if ((!c.pdf || !c.pdf.claves) && c.pdfUrl) {
    try {
      const r = await fetch(c.pdfUrl);
      if (r.ok && /pdf/i.test(r.headers.get('content-type') || '')) {
        const b = Buffer.from(await r.arrayBuffer());
        return { nombre: `Cotizacion-Reiki-${c.numero || c.id}.pdf`, base64: b.toString('base64') };
      }
    } catch (err) {
      console.warn('[cotizaciones] pdfUrl', err?.message || err);
    }
    return null;
  }
  if (!c.pdf || !c.pdf.claves) return null;
  const redis = getRedis();
  let b64 = '';
  if (redis) {
    const vals = await redis.mget(...c.pdf.claves.map((k) => pdfKey(id, k)));
    b64 = vals.map((v) => String(v || '')).join('');
  } else b64 = c.pdf.claves.map((k) => pdfMem.get(`${id}:${k}`) || '').join('');
  if (!b64) return null;
  return { nombre: c.pdf.nombre, base64: b64 };
}

/* ---------------- seguimiento, estados y envío ---------------- */

export async function registrarSeguimiento(id, { canal, nota, proximo, resultado } = {}, by = 'panel') {
  const c = await getCotizacion(id);
  if (!c) return null;
  const s = { at: nowIso(), by: str(by, 40), canal: str(canal, 30) || 'llamada', nota: str(nota, 600), resultado: str(resultado, 40) };
  c.seguimientos = [s, ...(c.seguimientos || [])].slice(0, 60);
  if (['por_enviar', 'enviada'].includes(c.estado)) c.estado = 'seguimiento';
  c.proximoSeguimiento = proximo ? str(proximo, 10) : sumarDias(hoy(), 4);
  pushHist(c, by, `Seguimiento por ${s.canal}${s.nota ? `: ${s.nota.slice(0, 120)}` : ''}. Próximo: ${c.proximoSeguimiento}.`);
  return persist(c);
}

export async function cambiarEstado(id, { estado, motivo, proximo, crearVenta = true } = {}, by = 'panel') {
  const c = await getCotizacion(id);
  if (!c) return null;
  if (!ESTADOS_COT.includes(estado)) throw new Error('estado inválido');
  if (estado === 'rechazada' && !str(motivo)) throw new Error('indica el motivo del rechazo');
  c.estado = estado;
  if (estado === 'rechazada') {
    c.motivoRechazo = str(motivo, 300);
    c.cerrada = nowIso();
    c.proximoSeguimiento = '';
  }
  if (estado === 'aceptada') {
    c.cerrada = nowIso();
    c.proximoSeguimiento = '';
    if (crearVenta && !c.expedienteId) {
      const exp = await saveExpediente(
        {
          tipo: c.tipo === 'proyecto' ? 'proyecto' : 'tienda',
          origen: 'cotizacion',
          fechaAprobacion: nowIso(),
          titulo: c.titulo,
          cliente: c.cliente || {},
          cotizacion: { numero: c.numero || c.id, fecha: c.fecha || '' },
          total: c.total,
          condicionesPago: c.condicionesPago || '',
          items: (c.items || []).map((i) => ({ nombre: i.nombre, sku: i.sku, cantidad: i.cantidad, precioUnit: i.precioUnit, costoUnit: i.costoUnit, proveedor: i.proveedor || undefined })),
          notas: `Creada desde la cotización ${c.numero || c.id}.${c.notas ? ' ' + c.notas : ''}`.slice(0, 2000),
        },
        by
      );
      const noComprar = (c.items || [])
        .map((i, idx) => ({ i, idx }))
        .filter((x) => x.i.comprar === false)
        .map((x) => ({ id: exp.id, idx: x.idx, estado: 'no_aplica' }));
      if (noComprar.length) await actualizarCompras(noComprar, by);
      c.expedienteId = exp.id;
    } else if (c.expedienteId) {
      await getExpediente(c.expedienteId);
    }
  }
  if (['enviada', 'seguimiento'].includes(estado)) {
    delete c.motivoRechazo;
    delete c.cerrada;
    c.proximoSeguimiento = str(proximo, 10) || c.proximoSeguimiento || sumarDias(hoy(), 3);
  }
  if (estado === 'por_enviar') c.proximoSeguimiento = '';
  pushHist(c, by, `Estado → ${estado}${estado === 'rechazada' ? `: ${c.motivoRechazo}` : ''}${c.expedienteId && estado === 'aceptada' ? ` · venta ${c.expedienteId}` : ''}`);
  return persist(c);
}

/** Envía la cotización (o un seguimiento) por correo desde info@, con el PDF adjunto si existe. */
export async function enviarCotizacion(id, { para, cc, asunto, cuerpo, adjuntarPdf = true, tipo = 'envio' } = {}, by = 'panel') {
  const c = await getCotizacion(id);
  if (!c) return null;
  const to = str(para || c.cliente?.correo, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('correo del cliente inválido o vacío');
  let adjuntos = [];
  if (adjuntarPdf) {
    const pdf = await leerPdf(id);
    if (pdf) adjuntos = [{ filename: pdf.nombre, content: Buffer.from(pdf.base64, 'base64'), contentType: 'application/pdf' }];
    else if (tipo === 'envio') throw new Error('esta cotización no tiene PDF cargado');
  }
  const r = await enviarConAdjunto({ to, cc: str(cc, 200), subject: str(asunto, 200), cuerpo: String(cuerpo || ''), adjuntos });
  const reg = { at: nowIso(), by: str(by, 40), para: to, asunto: str(asunto, 200), tipo, adjunto: adjuntos.length > 0, estado: r.ok ? 'enviado' : 'no_enviado', motivo: r.ok ? '' : r.motivo };
  c.envios = [reg, ...(c.envios || [])].slice(0, 40);
  if (r.ok) {
    if (!c.cliente?.correo) c.cliente = { ...(c.cliente || {}), correo: to };
    if (tipo === 'envio') {
      if (c.estado === 'por_enviar') c.estado = 'enviada';
      c.proximoSeguimiento = sumarDias(hoy(), 3);
    } else {
      c.seguimientos = [{ at: nowIso(), by: str(by, 40), canal: 'correo', nota: `Correo de seguimiento: "${reg.asunto}"` }, ...(c.seguimientos || [])].slice(0, 60);
      if (['por_enviar', 'enviada'].includes(c.estado)) c.estado = 'seguimiento';
      c.proximoSeguimiento = sumarDias(hoy(), 4);
    }
  }
  pushHist(c, by, r.ok ? `Correo enviado a ${to}: "${reg.asunto}"${reg.adjunto ? ' (con PDF)' : ''}` : `Correo no enviado: ${r.motivo}`);
  await persist(c);
  return { cot: c, enviado: r.ok, motivo: r.ok ? '' : r.motivo };
}

/** Token con permiso solo para registrar cotizaciones desde los chats (derivado del token de Claude). */
export function tokenCotizaciones() {
  const base = String(process.env.CLAUDE_AGENT_TOKEN || '').trim();
  if (base.length < 24) return '';
  return 'cotz_' + crypto.createHmac('sha256', base).update('reiki-cotizaciones-v1').digest('base64url').slice(0, 40);
}

/** Cotización creada por la página web o el bot de WhatsApp (cotizacion-store) → registro del panel. */
export async function registrarDesdeTienda(doc) {
  try {
    if (!doc || !doc.numero || doc.origen === 'tienda_pedido') return null;
    const items = (doc.items || []).map((it) => ({ nombre: it.nombre, sku: it.id || it.sku, cantidad: it.cantidad, precio: it.precio_unit, categoria: it.categoria }));
    if (doc.envio) items.push({ nombre: 'Envío', cantidad: 1, precio: doc.envio, comprar: false });
    return await guardarCotizacion(
      {
        numero: doc.numero,
        tipo: 'equipos',
        origen: doc.origen === 'web' ? 'web' : 'whatsapp',
        canal: doc.canal || '',
        webId: doc.id,
        fecha: doc.fecha,
        validez: doc.validez,
        cliente: { nombre: doc.cliente?.nombre, ciudad: doc.cliente?.ciudad, celular: doc.cliente?.celular, correo: doc.cliente?.correo },
        total: doc.total,
        subtotal: doc.subtotal,
        iva: doc.iva,
        items,
        pdfUrl: doc.pdfUrl,
        linkCompra: doc.link_compra,
        creada: doc.fechaIso,
        descripcion: `Cotización generada por el cliente en ${doc.origen === 'web' ? 'la página web' : 'WhatsApp'}`,
        proximoSeguimiento: hoy(),
      },
      doc.origen === 'web' ? 'página web' : 'bot WhatsApp'
    );
  } catch (err) {
    console.warn('[cotizaciones] registrar tienda', err?.message || err);
    return null;
  }
}

/** Estado de la cotización de la tienda cambió (p. ej. pagada en línea). */
export async function estadoDesdeTienda(doc, estado) {
  try {
    if (!doc || !doc.numero) return;
    const id = idDeNumero(doc.numero);
    const c = await getCotizacion(id);
    if (!c) return;
    if (/pagada/.test(estado) && c.estado !== 'aceptada') {
      // la venta la crea el pedido web pagado (Compras en tienda); aquí solo se cierra la cotización
      await cambiarEstado(id, { estado: 'aceptada', crearVenta: false }, 'pago en línea');
    } else if (estado === 'quiere_comprar' && c.estado === 'por_enviar') {
      await registrarSeguimiento(id, { canal: 'whatsapp', nota: 'El cliente indicó por WhatsApp que quiere comprar.', proximo: hoy() }, 'bot WhatsApp');
    }
  } catch (err) {
    console.warn('[cotizaciones] estado tienda', err?.message || err);
  }
}

/**
 * Importa al registro las cotizaciones de la página web y WhatsApp guardadas en cotizacion-store
 * (claves reiki:wa:cot:<id>) desde una fecha. No toca las que ya existen en el registro.
 * Si hay una venta del panel con ese número de cotización, la enlaza y la marca aceptada.
 */
export async function importarDeTienda({ desde = '', listarVentas } = {}) {
  const redis = getRedis();
  if (!redis) throw new Error('Redis no disponible');
  const claves = [];
  let cursor = 0;
  do {
    const r = await redis.scan(cursor, { match: 'reiki:wa:cot:*', count: 500 });
    cursor = Number(r[0]);
    for (const k of r[1] || []) if (/^reiki:wa:cot:[^:]+$/.test(k)) claves.push(k);
  } while (cursor !== 0 && claves.length < 5000);
  const ventas = listarVentas ? await listarVentas() : [];
  const res = { revisadas: claves.length, importadas: [], omitidas: 0 };
  for (let i = 0; i < claves.length; i += 100) {
    const vals = await redis.mget(...claves.slice(i, i + 100));
    for (const raw of vals) {
      const doc = raw && (typeof raw === 'string' ? JSON.parse(raw) : raw);
      if (!doc || !doc.numero || doc.origen === 'tienda_pedido') continue;
      const dia = String(doc.fechaIso || '').slice(0, 10);
      if (desde && dia && dia < desde) continue;
      const id = idDeNumero(doc.numero);
      if (await getCotizacion(id)) {
        res.omitidas += 1;
        continue;
      }
      const c = await registrarDesdeTienda(doc);
      if (!c) continue;
      const venta = ventas.find((v) => idDeNumero(v.cotizacion?.numero || '') === id);
      if (venta) {
        await guardarCotizacion({ id, expedienteId: venta.id }, 'importación');
        await cambiarEstado(id, { estado: 'aceptada' }, 'importación');
      } else if (/pagada/.test(String(doc.estado || ''))) {
        await cambiarEstado(id, { estado: 'aceptada', crearVenta: false }, 'importación');
      }
      res.importadas.push({ numero: doc.numero, cliente: doc.cliente?.nombre || '', total: doc.total, fecha: dia, origen: doc.origen, venta: venta ? venta.id : '' });
    }
  }
  return res;
}
