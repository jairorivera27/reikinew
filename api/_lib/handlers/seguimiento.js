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
 * GET  op=equipos              → equipos comprometidos (por pedir / pedidos / en camino) por proveedor
 * POST op=alegra-snapshot      { facturacionMensual, cartera, recaudoMensual, topClientes } (lo carga Claude)
 * POST op=correo  { id, key } → reintenta el correo al cliente de esa etapa
 * POST op=pago    { id, pago: { id?, fecha, monto, medio, referencia, estado: verificado|por_verificar, nota } }
 */
import { adminAuthOk, adminActor, readJsonBody } from '../admin-auth.js';
import { listRecentCheckoutOrders } from '../checkout-order-store.js';
import {
  PLANTILLAS,
  addPago,
  expedienteDesdePedido,
  getExpediente,
  listExpedientes,
  reenviarCorreo,
  resumen,
  saveExpediente,
  updateEtapa,
} from '../seguimiento.js';
import { getRedis } from '../whatsapp-redis.js';
import { calcularDesempeno, equiposComprometidos, guardarAlegra, leerAlegra } from '../desempeno.js';
import { correoConfigurado, etapasConCorreo, etapasConFecha } from '../correos.js';

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

async function sincronizarPedidosWeb() {
  try {
    const orders = await listRecentCheckoutOrders(30);
    for (const o of orders) {
      if (String(o.status || '').toLowerCase() === 'approved') await expedienteDesdePedido(o);
    }
  } catch (err) {
    console.warn('[seguimiento] sync pedidos web', err?.message || err);
  }
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
  if (!adminAuthOk(req)) return send(res, 401, { ok: false, error: 'No autorizado.' });

  const q = query(req);
  const op = String(q.op || 'list');
  const by = adminActor(req);

  try {
    if (req.method === 'GET') {
      if (op === 'list') {
        await sincronizarPedidosWeb();
        const items = (await listExpedientes()).map(conResumen);
        return send(res, 200, { ok: true, count: items.length, expedientes: items, plantillas: PLANTILLAS, correos: { tienda: etapasConCorreo('tienda'), proyecto: etapasConCorreo('proyecto') }, conFecha: { tienda: etapasConFecha('tienda'), proyecto: etapasConFecha('proyecto') }, correoConfigurado: correoConfigurado() });
      }
      if (op === 'get') {
        const e = await getExpediente(q.id);
        return e ? send(res, 200, { ok: true, expediente: conResumen(e) }) : send(res, 404, { ok: false, error: 'No existe.' });
      }
      if (op === 'revision') {
        const a = await leerAlegra();
        return send(res, 200, { ok: true, ...(await revision(q.marcar === '1')), alegraActualizado: a ? a.guardado : null });
      }
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
    if (op === 'alegra-snapshot') {
      const doc = await guardarAlegra(body || {});
      return send(res, 200, { ok: true, guardado: doc.guardado });
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
