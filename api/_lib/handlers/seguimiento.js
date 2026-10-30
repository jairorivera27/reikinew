/**
 * /api/seguimiento?op=…  (router /api/checkout?accion=seguimiento)
 * Header: Authorization: Bearer <ADMIN_ORDERS_SECRET | CLAUDE_AGENT_TOKEN>
 *
 * GET  op=list                 → expedientes (sincroniza pedidos web aprobados) + plantillas
 * GET  op=get&id=              → un expediente
 * GET  op=revision[&marcar=1]  → nuevos sin notificar, pendientes y alertas (para la revisión programada)
 * POST op=save    { id?, tipo, titulo, cliente, cotizacion, total, items, pagos, condicionesPago, envio, factura, notas, estado }
 * POST op=etapa   { id, key, estado: pendiente|en_curso|hecho|no_aplica, nota? }
 * GET  op=desempeno            → KPIs, ventas por mes, proveedores, cuellos de botella y la foto de Alegra
 * GET  op=inicio               → resumen: periodos (hoy/semana/mes), equipos, acciones del día y KPIs
 * GET  op=compras[&todos=1]    → equipos por comprar por venta y por proveedor (con disponibilidad en tienda)
 * POST op=compra { cambios:[{ id, idx, estado: por_pedir|pedido|recibido|no_aplica, nota }] }
 * GET  op=equipos              → equipos comprometidos (por pedir / pedidos / en camino) por proveedor
 * POST op=alegra-snapshot      { facturacionMensual, cartera, recaudoMensual, topClientes } (lo carga Claude)
 * Cotizaciones:
 * GET  op=cot-list | cot-get&id= | cot-pdf&id= (base64)
 * POST op=cot-numero → { numero } siguiente número del consecutivo único CT-DDMMAA-### (también con el token limitado)
 * POST op=cot-save { numero, tipo: equipos|proyecto, cliente, total, items, … }   (también con el token limitado de los chats)
 * POST op=cot-pdf  { id|numero, nombre, base64, parte, total }                  (también con el token limitado)
 * POST op=cot-estado { id, estado: por_enviar|enviada|seguimiento|aceptada|rechazada, motivo?, proximo? } — aceptada crea la venta
 * POST op=cot-seguimiento { id, canal, nota, proximo? }
 * POST op=cot-enviar { id, para?, cc?, asunto, cuerpo, adjuntarPdf?, tipo: envio|seguimiento }
 * POST op=alegra-borrador { id } → prefactura en borrador en Alegra (sin emitir); devuelve url para abrirla
 * POST op=alegra-sync { id }     → si ya se emitió: guarda el número RK, cierra la etapa, avisa al cliente y registra el pago en Alegra
 * POST op=correo-libre { id, asunto, cuerpo, cc? } → correo redactado al cliente del expediente (texto plano; • para viñetas)
 * POST op=correo  { id, key } → reintenta el correo al cliente de esa etapa
 * POST op=pago    { id, pago: { id?, fecha, monto, medio, referencia, estado: verificado|por_verificar, nota } }
 */
import { adminAuthOk, adminActor, readJsonBody } from '../admin-auth.js';
import {
  PLANTILLAS,
  addPago,
  expedienteDesdePedido,
  getExpediente,
  listExpedientes,
  sincronizarPedidosWeb,
  actualizarCompras,
  reenviarCorreo,
  enviarCorreoLibre,
  prepararFacturaAlegra,
  sincronizarFacturaAlegra,
  resumen,
  saveExpediente,
  updateEtapa,
} from '../seguimiento.js';
import { getRedis } from '../whatsapp-redis.js';
import { calcularDesempeno, calcularInicio, comprasPendientes, equiposComprometidos, guardarAlegra, leerAlegra } from '../desempeno.js';
import { correoConfigurado, etapasConCorreo, etapasConFecha } from '../correos.js';
import { alegraConfigurado } from '../alegra.js';
import {
  cambiarEstado,
  conResumenCot,
  enviarCotizacion,
  getCotizacion,
  guardarCotizacion,
  guardarPdfParte,
  leerPdf,
  listCotizaciones,
  registrarSeguimiento,
  tokenCotizaciones,
  importarDeTienda,
} from '../cotizaciones.js';

const OPS_CHAT = new Set(['cot-save', 'cot-pdf', 'cot-numero']);
function tokenChatOk(req) {
  const t = tokenCotizaciones();
  const h = String(req.headers.authorization || '').trim();
  return Boolean(t) && h.toLowerCase().startsWith('bearer ') && h.slice(7).trim() === t;
}

function send(res, code, body) {
  res.statusCode = code;
  return res.end(JSON.stringify(body));
}

function query(req) {
  try {
    return Object.fromEntries(new URL(req.url || '', 'http://localhost').searchParams.entries());
  } catch {
    return req.query || {};
  }
}

function conResumen(e) {
  return { ...e, resumen: resumen(e) };
}


function diasDesde(iso) {
  const t = Date.parse(iso || '');
  return t ? Math.floor((Date.now() - t) / 86400000) : null;
}

async function revision(marcar) {
  await sincronizarPedidosWeb();
  const todos = await listExpedientes();
  const activos = todos.filter((e) => e.estado === 'activo');
  const nuevos = activos.filter((e) => !e.notificado);
  const alertas = [];
  for (const e of activos) {
    const r = resumen(e);
    const nombre = `${e.titulo} (${e.id})`;
    if (r.porVerificar > 0) alertas.push(`${nombre}: hay $${r.porVerificar.toLocaleString('es-CO')} en pagos por verificar.`);
    for (const et of e.etapas || []) {
      const d = diasDesde(et.fecha);
      if (et.estado === 'en_curso' && d !== null && d >= 3) alertas.push(`${nombre}: "${et.label}" lleva ${d} días en curso.`);
    }
    const sinProv = (e.items || []).filter((i) => !i.proveedor || i.proveedor === 'Por confirmar');
    if (sinProv.length) alertas.push(`${nombre}: ${sinProv.length} equipo(s) sin proveedor identificado.`);
  }
  if (marcar && nuevos.length) {
    for (const e of nuevos) {
      const full = await getExpediente(e.id);
      if (full) {
        full.notificado = true;
        full.updatedAt = new Date().toISOString();
        const redis = getRedis();
        if (redis) await redis.set(`reiki:wa:seg:${full.id}`, full);
      }
    }
  }
  return {
    generado: new Date().toISOString(),
    nuevos: nuevos.map(conResumen),
    activos: activos.map((e) => {
      const r = resumen(e);
      return {
        id: e.id,
        tipo: e.tipo,
        titulo: e.titulo,
        cliente: e.cliente?.nombre || '',
        avance: r.avance,
        estadoPago: r.estadoPago,
        total: r.total,
        pagado: r.pagado,
        saldo: r.saldo,
        siguiente: r.siguiente,
        proveedores: r.proveedores,
      };
    }),
    alertas,
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const q = query(req);
  const op = String(q.op || 'list');
  const chat = !adminAuthOk(req) && OPS_CHAT.has(op) && req.method === 'POST' && tokenChatOk(req);
  if (!chat && !adminAuthOk(req)) return send(res, 401, { ok: false, error: 'No autorizado.' });
  const by = chat ? 'Claude (chat)' : adminActor(req);

  try {
    if (req.method === 'GET') {
      if (op === 'list') {
        await sincronizarPedidosWeb();
        const items = (await listExpedientes()).map(conResumen);
        return send(res, 200, { ok: true, count: items.length, expedientes: items, plantillas: PLANTILLAS, correos: { tienda: etapasConCorreo('tienda'), proyecto: etapasConCorreo('proyecto') }, conFecha: { tienda: etapasConFecha('tienda'), proyecto: etapasConFecha('proyecto') }, correoConfigurado: correoConfigurado(), alegraConfigurado: alegraConfigurado() });
      }
      if (op === 'get') {
        const e = await getExpediente(q.id);
        return e ? send(res, 200, { ok: true, expediente: conResumen(e) }) : send(res, 404, { ok: false, error: 'No existe.' });
      }
      if (op === 'revision') {
        const a = await leerAlegra();
        return send(res, 200, { ok: true, ...(await revision(q.marcar === '1')), alegraActualizado: a ? a.guardado : null });
      }
      if (op === 'cot-list') {
        const items = (await listCotizaciones()).map(conResumenCot);
        return send(res, 200, { ok: true, count: items.length, cotizaciones: items });
      }
      if (op === 'cot-get') {
        const c = await getCotizacion(q.id);
        return c ? send(res, 200, { ok: true, cotizacion: conResumenCot(c) }) : send(res, 404, { ok: false, error: 'No existe.' });
      }
      if (op === 'cot-pdf') {
        const p = await leerPdf(q.id);
        return p ? send(res, 200, { ok: true, ...p }) : send(res, 404, { ok: false, error: 'Sin PDF.' });
      }
      if (op === 'cot-token') {
        // Solo con el token de Claude: entrega el token limitado que usan las habilidades de cotización
        if (by !== 'claude') return send(res, 403, { ok: false, error: 'Solo para el asistente.' });
        return send(res, 200, { ok: true, token: tokenCotizaciones() });
      }
      if (op === 'inicio') return send(res, 200, { ok: true, ...(await calcularInicio()) });
      if (op === 'compras') return send(res, 200, { ok: true, ...(await comprasPendientes({ todos: q.todos === '1' })) });
      if (op === 'desempeno') return send(res, 200, { ok: true, ...(await calcularDesempeno()) });
      if (op === 'equipos') return send(res, 200, { ok: true, ...(await equiposComprometidos()) });
      return send(res, 400, { ok: false, error: 'op desconocida' });
    }

    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Método no permitido.' });
    const body = await readJsonBody(req);

    if (op === 'save') {
      if (body.id && !(await getExpediente(body.id))) return send(res, 404, { ok: false, error: 'No existe.' });
      const e = await saveExpediente(body, by);
      return send(res, 200, { ok: true, expediente: conResumen(e) });
    }
    if (op === 'etapa') {
      const e = await updateEtapa(body.id, String(body.key || ''), { estado: body.estado, nota: body.nota, fechaCliente: body.fechaCliente }, by);
      return e ? send(res, 200, { ok: true, expediente: conResumen(e) }) : send(res, 404, { ok: false, error: 'No existe.' });
    }
    if (op === 'pago') {
      const e = await addPago(body.id, body.pago, by);
      return e ? send(res, 200, { ok: true, expediente: conResumen(e) }) : send(res, 404, { ok: false, error: 'No existe.' });
    }
    if (op === 'compra') {
      const cambios = Array.isArray(body.cambios) ? body.cambios.slice(0, 200) : [];
      if (!cambios.length) return send(res, 400, { ok: false, error: 'Sin cambios.' });
      const exps = await actualizarCompras(cambios, by);
      return send(res, 200, { ok: true, actualizados: exps.length, expedientes: exps.map(conResumen) });
    }
    if (op === 'alegra-snapshot') {
      const doc = await guardarAlegra(body || {});
      return send(res, 200, { ok: true, guardado: doc.guardado });
    }
    if (op === 'cot-numero') {
      // Reserva el siguiente número del consecutivo único (CT-DDMMAA-###)
      const { allocNumero } = await import('../cotizacion-store.js');
      const numero = await allocNumero();
      return send(res, 200, { ok: true, numero });
    }
    if (op === 'cot-save') {
      const c = await guardarCotizacion(body || {}, by);
      return send(res, 200, { ok: true, id: c.id, cotizacion: conResumenCot(c) });
    }
    if (op === 'cot-pdf') {
      const id = String(body.id || '') || (body.numero ? (await import('../cotizaciones.js')).idDeNumero(body.numero) : '');
      const r = await guardarPdfParte(id, { nombre: body.nombre, base64: body.base64, parte: body.parte, total: body.total }, by);
      if (!r) return send(res, 404, { ok: false, error: 'Registra primero la cotización (op=cot-save).' });
      return send(res, 200, { ok: true, id, completo: r.completo, recibidas: r.recibidas, total: r.total });
    }
    if (op === 'cot-importar-tienda') {
      const r = await importarDeTienda({ desde: String(body.desde || ''), listarVentas: listExpedientes });
      return send(res, 200, { ok: true, ...r });
    }
    if (op === 'cot-estado') {
      const c = await cambiarEstado(body.id, { estado: body.estado, motivo: body.motivo, proximo: body.proximo }, by);
      if (!c) return send(res, 404, { ok: false, error: 'No existe.' });
      const exp = c.expedienteId ? await getExpediente(c.expedienteId) : null;
      return send(res, 200, { ok: true, cotizacion: conResumenCot(c), expediente: exp ? { ...exp, resumen: resumen(exp) } : null });
    }
    if (op === 'cot-seguimiento') {
      const c = await registrarSeguimiento(body.id, { canal: body.canal, nota: body.nota, proximo: body.proximo, resultado: body.resultado }, by);
      return c ? send(res, 200, { ok: true, cotizacion: conResumenCot(c) }) : send(res, 404, { ok: false, error: 'No existe.' });
    }
    if (op === 'cot-enviar') {
      const r = await enviarCotizacion(body.id, { para: body.para, cc: body.cc, asunto: body.asunto, cuerpo: body.cuerpo, adjuntarPdf: body.adjuntarPdf !== false, tipo: body.tipo === 'seguimiento' ? 'seguimiento' : 'envio' }, by);
      if (!r) return send(res, 404, { ok: false, error: 'No existe.' });
      return send(res, r.enviado ? 200 : 502, { ok: r.enviado, error: r.enviado ? undefined : r.motivo, cotizacion: conResumenCot(r.cot) });
    }
    if (op === 'alegra-borrador') {
      const r = await prepararFacturaAlegra(body.id, by);
      if (!r) return send(res, 404, { ok: false, error: 'No existe.' });
      return send(res, 200, { ok: true, url: r.url, reutilizada: Boolean(r.reutilizada), yaEmitida: Boolean(r.yaEmitida), borrador: r.borrador || null, expediente: { ...r.exp, resumen: resumen(r.exp) } });
    }
    if (op === 'alegra-sync') {
      const r = await sincronizarFacturaAlegra(body.id, by);
      if (!r) return send(res, 404, { ok: false, error: 'No existe.' });
      return send(res, 200, { ok: true, factura: r.factura, pago: r.pago, expediente: { ...r.exp, resumen: resumen(r.exp) } });
    }
    if (op === 'correo-libre') {
      const r = await enviarCorreoLibre(body.id, { asunto: body.asunto, cuerpo: body.cuerpo, cc: body.cc }, by);
      if (!r) return send(res, 404, { ok: false, error: 'No existe.' });
      return send(res, r.enviado ? 200 : 502, { ok: r.enviado, error: r.enviado ? undefined : r.motivo, expediente: conResumen(r.exp) });
    }
    if (op === 'correo') {
      const e = await reenviarCorreo(body.id, String(body.key || ''), by);
      return e ? send(res, 200, { ok: true, expediente: conResumen(e) }) : send(res, 404, { ok: false, error: 'No existe.' });
    }
    return send(res, 400, { ok: false, error: 'op desconocida' });
  } catch (err) {
    console.error('[seguimiento]', err);
    return send(res, 400, { ok: false, error: String(err?.message || err).slice(0, 200) });
  }
}
