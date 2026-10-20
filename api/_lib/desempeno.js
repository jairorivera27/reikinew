/**
 * Desempeño de Reiki y equipos comprometidos.
 * - Ventas aprobadas, cobrado, saldo y margen salen de los expedientes (Compras en tienda y Proyectos).
 * - Ventas web salen de los pedidos del carrito (Wompi/Addi) aprobados.
 * - Facturación y cartera salen de Alegra: Claude las lee con su conector y guarda una
 *   "foto" aquí (op=alegra-snapshot), porque el sitio no tiene acceso directo a Alegra.
 */
import { getRedis, waKey } from './whatsapp-redis.js';
import { listExpedientes, resumen } from './seguimiento.js';
import { listRecentCheckoutOrders } from './checkout-order-store.js';

const ALEGRA_KEY = waKey('metricas', 'alegra');
let alegraMem = globalThis.__reikiAlegraSnap || null;

function mesDe(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return String(iso || '').slice(0, 7);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7);
}

function ultimosMeses(n) {
  const out = [];
  const hoy = new Date();
  const [y, m] = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).split('-').map(Number);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export async function guardarAlegra(datos) {
  const doc = { ...datos, guardado: new Date().toISOString() };
  alegraMem = doc;
  globalThis.__reikiAlegraSnap = doc;
  const redis = getRedis();
  if (redis) await redis.set(ALEGRA_KEY, doc);
  return doc;
}

export async function leerAlegra() {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(ALEGRA_KEY);
      if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      console.warn('[desempeno] alegra get', err?.message || err);
    }
  }
  return alegraMem;
}

export async function calcularDesempeno() {
  const meses = ultimosMeses(6);
  const base = () => Object.fromEntries(meses.map((m) => [m, { tienda: 0, proyecto: 0, nTienda: 0, nProyecto: 0, web: 0, nWeb: 0, cobrado: 0 }]));
  const porMes = base();

  const exps = (await listExpedientes()).filter((e) => e.estado !== 'cancelado' && !/^PRUEBA/i.test(e.titulo || ''));
  let saldo = 0;
  let porVerificar = 0;
  let margenSum = 0;
  let ventasConCosto = 0;
  const proveedores = {};
  const etapasAbiertas = {};

  for (const e of exps) {
    const r = resumen(e);
    const m = mesDe(e.cotizacion?.fecha || e.createdAt);
    if (porMes[m]) {
      porMes[m][e.tipo] += r.total;
      porMes[m][e.tipo === 'proyecto' ? 'nProyecto' : 'nTienda'] += 1;
    }
    for (const p of e.pagos || []) {
      if (p.estado === 'verificado' && porMes[mesDe(p.fecha)]) porMes[mesDe(p.fecha)].cobrado += p.monto;
    }
    if (e.estado === 'activo') {
      saldo += r.saldo;
      porVerificar += r.porVerificar;
      if (r.siguiente) etapasAbiertas[r.siguiente.label] = (etapasAbiertas[r.siguiente.label] || 0) + 1;
    }
    if (r.margen != null) {
      margenSum += r.margen;
      ventasConCosto += r.total;
    }
    for (const it of e.items || []) {
      const p = it.proveedor || 'Por confirmar';
      proveedores[p] = (proveedores[p] || 0) + it.precioUnit * it.cantidad;
    }
  }

  try {
    const web = await listRecentCheckoutOrders(185);
    for (const o of web) {
      if (String(o.status).toLowerCase() !== 'approved') continue;
      const m = mesDe(o.paidAt || o.createdAt);
      if (porMes[m]) {
        porMes[m].web += Number(o.totalAmount) || 0;
        porMes[m].nWeb += 1;
      }
    }
  } catch (err) {
    console.warn('[desempeno] web', err?.message || err);
  }

  const activos = exps.filter((e) => e.estado === 'activo');
  const mesActual = meses[meses.length - 1];
  const mesAnterior = meses[meses.length - 2];
  const totalMes = (m) => porMes[m].tienda + porMes[m].proyecto;

  return {
    generado: new Date().toISOString(),
    meses: meses.map((m) => ({ mes: m, ...porMes[m] })),
    kpis: {
      ventasMes: totalMes(mesActual),
      ventasMesAnterior: totalMes(mesAnterior),
      cobradoMes: porMes[mesActual].cobrado,
      saldoPorCobrar: saldo,
      pagosPorVerificar: porVerificar,
      activosTienda: activos.filter((e) => e.tipo === 'tienda').length,
      activosProyectos: activos.filter((e) => e.tipo === 'proyecto').length,
      margenPct: ventasConCosto ? Math.round((margenSum / ventasConCosto) * 1000) / 10 : null,
      ventasConCosto,
    },
    proveedores: Object.entries(proveedores)
      .map(([proveedor, total]) => ({ proveedor, total }))
      .sort((a, b) => b.total - a.total),
    cuellos: Object.entries(etapasAbiertas)
      .map(([etapa, n]) => ({ etapa, n }))
      .sort((a, b) => b.n - a.n),
    alegra: await leerAlegra(),
  };
}

/** Estado de compra de cada equipo según las etapas de su expediente. */
function estadoEquipo(e) {
  const est = (k) => (e.etapas || []).find((x) => x.key === k)?.estado;
  const done = (k) => ['hecho', 'no_aplica'].includes(est(k));
  if (e.tipo === 'proyecto') {
    if (done('instalacion') || done('puesta_marcha')) return 'instalado';
    if (done('logistica')) return 'en_obra';
    if (est('logistica') === 'en_curso') return 'en_camino';
    if (done('compra_proveedor')) return 'comprado';
    if (est('compra_proveedor') === 'en_curso') return 'pedido';
    return 'por_pedir';
  }
  if (done('entrega')) return 'entregado';
  if (done('guia') || est('guia') === 'en_curso' || done('coordinacion_envio')) return 'en_camino';
  if (done('compra_proveedor')) return 'comprado';
  if (est('compra_proveedor') === 'en_curso') return 'pedido';
  return 'por_pedir';
}

export const ESTADOS_EQUIPO = {
  por_pedir: 'Por pedir',
  pedido: 'Pedido al proveedor',
  comprado: 'Comprado',
  en_camino: 'En camino',
  en_obra: 'En la obra',
  entregado: 'Entregado',
  instalado: 'Instalado',
};

export async function equiposComprometidos() {
  const exps = (await listExpedientes()).filter((e) => e.estado === 'activo');
  const filas = [];
  for (const e of exps) {
    const estado = estadoEquipo(e);
    const pagoOk = resumen(e).estadoPago === 'completo' || (e.etapas || []).some((x) => x.key === 'anticipo' && x.estado === 'hecho');
    for (const it of e.items || []) {
      filas.push({
        expediente: e.id,
        tipo: e.tipo,
        titulo: e.titulo,
        cliente: e.cliente?.nombre || '',
        equipo: it.nombre,
        cantidad: it.cantidad,
        proveedor: it.proveedor || 'Por confirmar',
        disponibilidad: it.disponibilidad || '',
        estado,
        pagoOk,
        valor: it.precioUnit * it.cantidad,
      });
    }
  }
  const porProveedor = {};
  for (const f of filas) {
    if (['entregado', 'instalado'].includes(f.estado)) continue;
    const p = (porProveedor[f.proveedor] = porProveedor[f.proveedor] || { proveedor: f.proveedor, porPedir: 0, enProceso: 0, valorPorPedir: 0 });
    if (f.estado === 'por_pedir') {
      p.porPedir += f.cantidad;
      p.valorPorPedir += f.valor;
    } else p.enProceso += f.cantidad;
  }
  return { filas, porProveedor: Object.values(porProveedor).sort((a, b) => b.porPedir - a.porPedir), estados: ESTADOS_EQUIPO };
}
