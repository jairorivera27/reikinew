/**
 * Inicio, desempeño y compras a proveedores.
 * - Ventas, cobros, tiempos y márgenes salen de los expedientes (Compras en tienda y Proyectos).
 *   Los pedidos web pagados (Wompi/Addi) se vuelven expedientes de tienda con origen "web".
 * - Facturación y cartera salen de Alegra: Claude las lee con su conector y guarda una
 *   "foto" aquí (op=alegra-snapshot), porque el sitio no tiene acceso directo a Alegra.
 * - Disponibilidad del catálogo: índice público de la tienda + data/disponibilidad-proveedores.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getRedis, waKey } from './whatsapp-redis.js';
import { fechaAprobacion, listExpedientes, resumen, sincronizarPedidosWeb } from './seguimiento.js';
import { listCotizaciones, resumenCot } from './cotizaciones.js';

const ALEGRA_KEY = waKey('metricas', 'alegra');
let alegraMem = globalThis.__reikiAlegraSnap || null;
const TZ = 'America/Bogota';
const DIA = 86400000;

/* ---------- fechas en hora de Bogotá ---------- */
function ymd(iso) {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}
const hoyYmd = () => ymd(new Date().toISOString());
function sumarDias(y, n) {
  const d = new Date(`${y}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function lunesDe(y) {
  const dow = new Date(`${y}T12:00:00Z`).getUTCDay(); // 0 domingo
  return sumarDias(y, -((dow + 6) % 7));
}
const mesDe = (iso) => ymd(iso).slice(0, 7);
function mesAnterior(m) {
  const [a, b] = m.split('-').map(Number);
  const d = new Date(Date.UTC(a, b - 2, 1));
  return d.toISOString().slice(0, 7);
}
function ultimosMeses(n) {
  const out = [];
  let m = hoyYmd().slice(0, 7);
  for (let i = 0; i < n; i += 1) {
    out.unshift(m);
    m = mesAnterior(m);
  }
  return out;
}
const dias = (a, b) => (Date.parse(b) - Date.parse(a)) / DIA;
const prom = (arr) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null);
const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

/* ---------- Alegra ---------- */
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

/* ---------- catálogo de la tienda ---------- */
let catCache = null;
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
function tokens(s) {
  return new Set(
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/(\d)[\s-]+(w|kw|kwh|wp|ah|v|vdc|vac|a|kva)\b/g, '$1$2')
      .split(/[^a-z0-9.]+/)
      .map((t) => t.replace(/^\.+|\.+$/g, ''))
      .filter((t) => t.length > 1 || /\d/.test(t))
  );
}
function leerDispoLocal() {
  for (const p of [path.join(process.cwd(), 'data', 'disponibilidad-proveedores.json')]) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      /* sigue */
    }
  }
  return null;
}
export async function catalogo() {
  if (catCache && Date.now() - catCache.at < 15 * 60000) return catCache;
  const base = process.env.SITE_URL || 'https://www.reikisolar.com.co';
  let items = [];
  try {
    const r = await fetch(`${base}/tienda/indice/todos.json`, { headers: { 'User-Agent': 'reiki-panel' } });
    if (r.ok) items = (await r.json()).items || [];
  } catch (err) {
    console.warn('[desempeno] catalogo', err?.message || err);
  }
  const dispo = leerDispoLocal();
  let slugCat = {};
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'config', 'categorias-tienda.json'), 'utf8'));
    for (const c of cfg.categorias || []) slugCat[c.id] = c.slug;
  } catch {
    slugCat = {};
  }
  const bajo = (dispo && dispo.productos) || {};
  const porSlug = new Map();
  const porTitulo = new Map();
  for (const it of items) {
    const v = {
      slug: it.slug,
      titulo: it.title,
      stock: it.stock || 'disponible',
      stockBajo: Boolean(bajo[it.slug] && bajo[it.slug].stockBajo),
      precio: it.priceNum || 0,
      categoria: it.categoryName || it.category || 'Otros',
      categoriaSlug: slugCat[it.category] || it.category || '',
    };
    v.tokens = tokens(it.title);
    porSlug.set(it.slug, v);
    porTitulo.set(norm(it.title), v);
  }
  catCache = { at: Date.now(), items, porSlug, porTitulo, revision: dispo ? dispo.ultima_revision : null };
  return catCache;
}
function buscarEnCatalogo(cat, it) {
  const exacto = (it.sku && cat.porSlug.get(it.sku)) || cat.porTitulo.get(norm(it.nombre));
  if (exacto) return exacto;
  // Coincidencia por palabras: todas (o casi) las palabras del equipo aparecen en un solo producto
  const tk = tokens(it.nombre);
  if (tk.size < 2) return null;
  let mejor = null;
  let segundo = 0;
  for (const v of cat.porSlug.values()) {
    let n = 0;
    for (const t of tk) if (v.tokens.has(t)) n += 1;
    const sc = n / tk.size;
    if (!mejor || sc > mejor.sc) {
      segundo = mejor ? mejor.sc : 0;
      mejor = { sc, v };
    } else if (sc > segundo) segundo = sc;
  }
  return mejor && mejor.sc >= 0.8 && mejor.sc > segundo ? mejor.v : null;
}

/* ---------- estado de compra de cada equipo ---------- */
const RANGO = { por_pedir: 0, pedido: 1, comprado: 2, en_camino: 3, en_obra: 4, entregado: 5, instalado: 5 };
export const ESTADOS_EQUIPO = {
  por_pedir: 'Por pedir',
  pedido: 'Pedido al proveedor',
  comprado: 'Recibido del proveedor',
  en_camino: 'En camino al cliente',
  en_obra: 'En la obra',
  entregado: 'Entregado',
  instalado: 'Instalado',
  no_aplica: 'No se compra',
};
function estadoPorEtapas(e) {
  const est = (k) => (e.etapas || []).find((x) => x.key === k)?.estado;
  const done = (k) => ['hecho', 'no_aplica'].includes(est(k));
  if (e.tipo === 'proyecto') {
    if (est('instalacion') === 'hecho' || est('puesta_marcha') === 'hecho') return 'instalado';
    if (done('logistica')) return 'en_obra';
    if (est('logistica') === 'en_curso') return 'en_camino';
    if (est('compra_proveedor') === 'hecho') return 'comprado';
    if (est('compra_proveedor') === 'en_curso') return 'pedido';
    return 'por_pedir';
  }
  if (est('entrega') === 'hecho') return 'entregado';
  if (done('guia') || est('guia') === 'en_curso' || est('coordinacion_envio') === 'hecho') return 'en_camino';
  if (est('compra_proveedor') === 'hecho') return 'comprado';
  if (est('compra_proveedor') === 'en_curso') return 'pedido';
  return 'por_pedir';
}
function estadoItem(e, it) {
  if (it.compra?.estado === 'no_aplica') return 'no_aplica';
  const base = estadoPorEtapas(e);
  const marcados = (e.items || []).some((x) => x.compra);
  const propio = { por_pedir: 'por_pedir', pedido: 'pedido', recibido: 'comprado' }[it.compra?.estado] || (marcados ? 'por_pedir' : null);
  if (!propio) return base;
  return RANGO[propio] >= RANGO[base] ? propio : RANGO[base] > RANGO.comprado ? base : propio;
}
function pagoListo(e, r) {
  if (r.estadoPago === 'completo') return 'completo';
  if ((e.etapas || []).some((x) => x.key === 'anticipo' && x.estado === 'hecho')) return 'anticipo';
  if (r.pagado > 0) return 'parcial';
  return 'sin_pago';
}
const valido = (e) => e.estado !== 'cancelado' && !/^PRUEBA/i.test(e.titulo || '');

/* ---------- Por comprar ---------- */
export async function comprasPendientes({ todos = false } = {}) {
  await sincronizarPedidosWeb();
  const cat = await catalogo();
  const exps = (await listExpedientes()).filter((e) => e.estado === 'activo' && valido(e));
  const ventas = [];
  const porProveedor = {};
  for (const e of exps) {
    const r = resumen(e);
    const pago = pagoListo(e, r);
    const primerPago = (e.pagos || [])
      .filter((p) => p.estado === 'verificado')
      .map((p) => p.verificadoAt || p.fecha)
      .sort()[0];
    const items = (e.items || []).map((it, idx) => {
      const c = buscarEnCatalogo(cat, it);
      const estado = estadoItem(e, it);
      return {
        idx,
        nombre: it.nombre,
        sku: it.sku,
        cantidad: it.cantidad,
        proveedor: it.proveedor || 'Por confirmar',
        codigoProveedor: it.codigoProveedor || '',
        compra: it.compra || null,
        estado,
        tienda: c ? { stock: c.stock, stockBajo: c.stockBajo, slug: c.slug, titulo: c.titulo } : null,
        valor: it.precioUnit * it.cantidad,
        costo: (it.costoUnit || 0) * it.cantidad,
      };
    });
    const pendientes = items.filter((i) => ['por_pedir', 'pedido'].includes(i.estado));
    if (!todos && !pendientes.length) continue;
    for (const i of pendientes) {
      const p = (porProveedor[i.proveedor] = porProveedor[i.proveedor] || {
        proveedor: i.proveedor,
        porPedir: 0,
        pedidas: 0,
        lineas: [],
      });
      if (i.estado === 'por_pedir') p.porPedir += i.cantidad;
      else p.pedidas += i.cantidad;
      p.lineas.push({ id: e.id, idx: i.idx, titulo: e.titulo, nombre: i.nombre, codigo: i.codigoProveedor, cantidad: i.cantidad, estado: i.estado, pago, costo: i.costo });
    }
    ventas.push({
      id: e.id,
      tipo: e.tipo,
      titulo: e.titulo,
      cliente: e.cliente?.nombre || '',
      ciudad: e.cliente?.ciudad || '',
      cotizacion: e.cotizacion?.numero || '',
      aprobada: fechaAprobacion(e),
      pago,
      pagado: r.pagado,
      total: r.total,
      diasDesdePago: primerPago ? Math.floor(dias(primerPago, new Date().toISOString())) : null,
      items,
      porPedir: items.filter((i) => i.estado === 'por_pedir').reduce((a, i) => a + i.cantidad, 0),
    });
  }
  const orden = { completo: 0, anticipo: 1, parcial: 2, sin_pago: 3 };
  ventas.sort((a, b) => orden[a.pago] - orden[b.pago] || String(a.aprobada).localeCompare(String(b.aprobada)));
  return {
    ventas,
    porProveedor: Object.values(porProveedor).sort((a, b) => b.porPedir - a.porPedir),
    estados: ESTADOS_EQUIPO,
  };
}

/* compatibilidad con la pestaña anterior */
export async function equiposComprometidos() {
  const c = await comprasPendientes();
  const filas = [];
  for (const v of c.ventas) {
    for (const i of v.items) {
      filas.push({ expediente: v.id, tipo: v.tipo, titulo: v.titulo, cliente: v.cliente, equipo: i.nombre, cantidad: i.cantidad, proveedor: i.proveedor, estado: i.estado, pagoOk: v.pago !== 'sin_pago', valor: i.valor });
    }
  }
  return { filas, porProveedor: c.porProveedor, estados: ESTADOS_EQUIPO };
}

/* ---------- Desempeño (pestaña) ---------- */
export async function calcularDesempeno() {
  await sincronizarPedidosWeb();
  const meses = ultimosMeses(6);
  const porMes = Object.fromEntries(meses.map((m) => [m, { tienda: 0, proyecto: 0, web: 0, cobrado: 0 }]));
  const exps = (await listExpedientes()).filter(valido);
  let saldo = 0;
  let porVerificar = 0;
  let margenSum = 0;
  let ventasConCosto = 0;
  const proveedores = {};
  const etapasAbiertas = {};
  for (const e of exps) {
    const r = resumen(e);
    const m = mesDe(fechaAprobacion(e));
    if (porMes[m]) porMes[m][e.tipo === 'proyecto' ? 'proyecto' : e.origen === 'web' ? 'web' : 'tienda'] += r.total;
    for (const p of e.pagos || []) {
      const mp = mesDe(p.fecha);
      if (p.estado === 'verificado' && porMes[mp]) porMes[mp].cobrado += p.monto;
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
  const activos = exps.filter((e) => e.estado === 'activo');
  const mA = meses[meses.length - 1];
  const mP = meses[meses.length - 2];
  const tot = (m) => porMes[m].tienda + porMes[m].proyecto + porMes[m].web;
  return {
    generado: new Date().toISOString(),
    meses: meses.map((m) => ({ mes: m, ...porMes[m] })),
    kpis: {
      ventasMes: tot(mA),
      ventasMesAnterior: tot(mP),
      cobradoMes: porMes[mA].cobrado,
      saldoPorCobrar: saldo,
      pagosPorVerificar: porVerificar,
      activosTienda: activos.filter((e) => e.tipo === 'tienda').length,
      activosProyectos: activos.filter((e) => e.tipo === 'proyecto').length,
      margenPct: ventasConCosto ? r1((margenSum / ventasConCosto) * 100) : null,
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

/* ---------- Inicio ---------- */
function rangos() {
  const hoy = hoyYmd();
  const lunes = lunesDe(hoy);
  const mes = hoy.slice(0, 7);
  const mesAnt = mesAnterior(mes);
  return {
    hoy: { desde: hoy, hasta: hoy, label: 'Hoy' },
    ayer: { desde: sumarDias(hoy, -1), hasta: sumarDias(hoy, -1), label: 'Ayer' },
    semana: { desde: lunes, hasta: hoy, label: 'Esta semana' },
    semanaAnt: { desde: sumarDias(lunes, -7), hasta: sumarDias(lunes, -1), label: 'Semana pasada' },
    mes: { desde: `${mes}-01`, hasta: hoy, label: 'Este mes' },
    mesAnt: { desde: `${mesAnt}-01`, hasta: sumarDias(`${mes}-01`, -1), label: 'Mes pasado' },
  };
}
const enRango = (y, r) => y && y >= r.desde && y <= r.hasta;

function metricasPeriodo(exps, r) {
  const out = { ventas: 0, nVentas: 0, web: 0, nWeb: 0, proyectos: 0, nProyectos: 0, cobrado: 0, unidades: 0, entregas: 0, instalaciones: 0 };
  for (const e of exps) {
    const rr = resumen(e);
    if (enRango(ymd(fechaAprobacion(e)), r)) {
      out.ventas += rr.total;
      out.nVentas += 1;
      out.unidades += (e.items || []).reduce((a, i) => a + i.cantidad, 0);
      if (e.tipo === 'proyecto') {
        out.proyectos += rr.total;
        out.nProyectos += 1;
      } else if (e.origen === 'web') {
        out.web += rr.total;
        out.nWeb += 1;
      }
    }
    for (const p of e.pagos || []) if (p.estado === 'verificado' && enRango(ymd(p.fecha), r)) out.cobrado += p.monto;
    for (const et of e.etapas || []) {
      if (et.estado !== 'hecho' || !enRango(ymd(et.fecha), r)) continue;
      if (e.tipo === 'tienda' && et.key === 'entrega') out.entregas += 1;
      if (e.tipo === 'proyecto' && et.key === 'puesta_marcha') out.instalaciones += 1;
    }
  }
  return out;
}

function kpi(key, nombre, valor, unidad, meta, sentido, porque, extra = {}) {
  let estado = 'sin_datos';
  if (valor != null && meta == null) estado = 'info';
  else if (valor != null) estado = (sentido === 'menor' ? valor <= meta : valor >= meta) ? 'ok' : 'alerta';
  return { key, nombre, valor, unidad, meta, sentido, estado, porque, ...extra };
}

export async function calcularInicio() {
  await sincronizarPedidosWeb();
  const R = rangos();
  const todos = (await listExpedientes()).filter(valido);
  const activos = todos.filter((e) => e.estado === 'activo');
  const alegra = await leerAlegra();
  const cat = await catalogo();
  const ahora = new Date().toISOString();
  const hace90 = new Date(Date.now() - 90 * DIA).toISOString();

  /* métricas por periodo */
  const periodos = {};
  for (const k of Object.keys(R)) periodos[k] = { ...R[k], ...metricasPeriodo(todos, R[k]) };

  /* equipos */
  const compras = await comprasPendientes({ todos: true });
  let porPedir = 0;
  let enPedido = 0;
  let porEntregar = 0;
  let porPedirPagado = 0;
  for (const v of compras.ventas) {
    for (const i of v.items) {
      if (i.estado === 'por_pedir') {
        porPedir += i.cantidad;
        if (v.pago !== 'sin_pago') porPedirPagado += i.cantidad;
      } else if (i.estado === 'pedido') enPedido += i.cantidad;
      else if (['comprado', 'en_camino', 'en_obra'].includes(i.estado)) porEntregar += i.cantidad;
    }
  }
  const publicados = cat.items.length;
  const disp = cat.items.filter((i) => i.stock === 'disponible');
  const pocas = disp.filter((i) => cat.porSlug.get(i.slug)?.stockBajo).length;
  const porCat = {};
  for (const v of cat.porSlug.values()) {
    const c = (porCat[v.categoria] = porCat[v.categoria] || { categoria: v.categoria, slug: v.categoriaSlug, total: 0, disponibles: 0, pocas: 0, preorden: 0 });
    c.total += 1;
    if (v.stock === 'disponible') {
      c.disponibles += 1;
      if (v.stockBajo) c.pocas += 1;
    } else c.preorden += 1;
  }
  const categorias = Object.values(porCat)
    .map((c) => {
      const pctDisp = c.total ? (c.disponibles / c.total) * 100 : 0;
      const pctPocas = c.disponibles ? (c.pocas / c.disponibles) * 100 : 0;
      // Semáforo: verde ≥ 90 % disponible y pocas unidades ≤ 1/3; amarillo 75–89 % o muchas con pocas unidades; rojo < 75 %
      const semaforo = pctDisp < 75 ? 'rojo' : pctDisp < 90 || pctPocas > 33 ? 'amarillo' : 'verde';
      return { ...c, pctDisp: r1(pctDisp), semaforo };
    })
    .sort((a, b) => ({ rojo: 0, amarillo: 1, verde: 2 })[a.semaforo] - ({ rojo: 0, amarillo: 1, verde: 2 })[b.semaforo] || a.pctDisp - b.pctDisp);
  const equipos = {
    catalogo: { publicados, disponibles: disp.length, pocas, preorden: publicados - disp.length, revision: cat.revision, categorias },
    vendidosMes: periodos.mes.unidades,
    vendidosSemana: periodos.semana.unidades,
    porPedir,
    porPedirPagado,
    enPedido,
    porEntregar,
  };

  /* acciones para hoy */
  const acciones = [];
  const add = (prioridad, icono, texto, ir, detalle) => acciones.push({ prioridad, icono, texto, ir, detalle: detalle || [] });
  const pv = activos.filter((e) => resumen(e).porVerificar > 0);
  if (pv.length)
    add(1, 'money', `${pv.length} venta(s) con pagos por verificar: $${pv.reduce((a, e) => a + resumen(e).porVerificar, 0).toLocaleString('es-CO')}`, { cat: 'tienda' }, pv.map((e) => ({ id: e.id, txt: e.titulo })));
  const sinCompra = compras.ventas.filter((v) => v.pago !== 'sin_pago' && v.items.some((i) => i.estado === 'por_pedir'));
  if (sinCompra.length)
    add(1, 'cart', `${sinCompra.length} venta(s) pagada(s) con equipos sin pedir al proveedor (${porPedirPagado} unidades)`, { cat: 'compras' }, sinCompra.map((v) => ({ id: v.id, txt: v.titulo })));
  const atascadas = [];
  for (const e of activos) {
    for (const et of e.etapas || []) {
      if (et.estado === 'en_curso' && et.fecha && dias(et.fecha, ahora) >= 3) atascadas.push({ id: e.id, txt: `${e.titulo}: ${et.label} (${Math.floor(dias(et.fecha, ahora))} días)` });
    }
  }
  if (atascadas.length) add(2, 'clock', `${atascadas.length} etapa(s) detenida(s) hace 3 días o más`, { cat: 'tienda' }, atascadas);
  const sinCorreo = activos.filter((e) => !e.cliente?.correo);
  if (sinCorreo.length) add(3, 'mail', `${sinCorreo.length} cliente(s) sin correo: no reciben los avisos`, { cat: 'tienda' }, sinCorreo.map((e) => ({ id: e.id, txt: e.titulo })));
  const correoFallido = activos.filter((e) => (e.correos || []).some((c) => c.estado === 'no_enviado' && !(e.correos || []).some((d) => d.clave === c.clave && d.estado === 'enviado')));
  if (correoFallido.length) add(3, 'mail', `${correoFallido.length} venta(s) con correos al cliente sin enviar`, { cat: 'tienda' }, correoFallido.map((e) => ({ id: e.id, txt: e.titulo })));
  const sinProv = activos.filter((e) => (e.items || []).some((i) => !i.proveedor || i.proveedor === 'Por confirmar'));
  if (sinProv.length) add(3, 'truck', `${sinProv.length} venta(s) con equipos sin proveedor identificado`, { cat: 'compras' }, sinProv.map((e) => ({ id: e.id, txt: e.titulo })));
  const vencida = (alegra?.cartera?.facturas || []).filter((f) => f.dias > 30);
  if (vencida.length)
    add(2, 'file', `Cartera vencida en Alegra (más de 30 días): $${vencida.reduce((a, f) => a + f.saldo, 0).toLocaleString('es-CO')} en ${vencida.length} factura(s)`, { cat: 'desempeno' }, vencida.slice(0, 6).map((f) => ({ txt: `${f.numero} · ${f.cliente} · ${f.dias} días` })));
  const porFacturar = activos.filter((e) => {
    const f = (e.etapas || []).find((x) => x.key === 'factura');
    const ent = (e.etapas || []).find((x) => x.key === (e.tipo === 'proyecto' ? 'puesta_marcha' : 'entrega'));
    return f && f.estado !== 'hecho' && f.estado !== 'no_aplica' && ent && ent.estado === 'hecho';
  });
  if (porFacturar.length) add(2, 'file', `${porFacturar.length} venta(s) entregada(s) sin factura`, { cat: 'tienda' }, porFacturar.map((e) => ({ id: e.id, txt: e.titulo })));
  /* cotizaciones */
  const cots = await listCotizaciones();
  const cotSeg = cots.filter((c) => resumenCot(c).seguimientoVencido);
  if (cotSeg.length)
    add(1, 'phone', `${cotSeg.length} cotización(es) para hacer seguimiento hoy ($${cotSeg.reduce((a, c) => a + (c.total || 0), 0).toLocaleString('es-CO')})`, { cat: 'cotizaciones' }, cotSeg.map((c) => ({ cot: c.id, txt: `${c.numero || c.id} · ${c.cliente?.nombre || ''}` })));
  const cotPorEnviar = cots.filter((c) => c.estado === 'por_enviar' && c.origen !== 'web' && c.origen !== 'whatsapp');
  if (cotPorEnviar.length) add(2, 'send', `${cotPorEnviar.length} cotización(es) hechas que aún no se le han enviado al cliente`, { cat: 'cotizaciones' }, cotPorEnviar.map((c) => ({ cot: c.id, txt: `${c.numero || c.id} · ${c.cliente?.nombre || ''}` })));
  const cotWebNuevas = cots.filter((c) => c.estado === 'por_enviar' && (c.origen === 'web' || c.origen === 'whatsapp'));
  if (cotWebNuevas.length) add(2, 'send', `${cotWebNuevas.length} cotización(es) que los clientes generaron en la página o WhatsApp, sin contactar`, { cat: 'cotizaciones' }, cotWebNuevas.map((c) => ({ cot: c.id, txt: `${c.numero || c.id} · ${c.cliente?.nombre || ''} · ${c.cliente?.celular || ''}` })));
  acciones.sort((a, b) => a.prioridad - b.prioridad);

  /* KPIs */
  const rec = todos.filter((e) => String(fechaAprobacion(e)) >= hace90);
  const tEntrega = [];
  const tProyecto = [];
  const tVerif = [];
  const tPedido = [];
  let margenSum = 0;
  let ventasConCosto = 0;
  for (const e of rec) {
    const et = (k) => (e.etapas || []).find((x) => x.key === k);
    if (e.tipo === 'tienda' && et('entrega')?.estado === 'hecho') tEntrega.push(dias(fechaAprobacion(e), et('entrega').fecha));
    if (e.tipo === 'proyecto' && et('puesta_marcha')?.estado === 'hecho') tProyecto.push(dias(fechaAprobacion(e), et('puesta_marcha').fecha));
    for (const p of e.pagos || []) {
      if (p.estado === 'verificado' && p.creadoAt && p.verificadoAt && !/wompi|addi/i.test(p.medio) && dias(p.creadoAt, p.verificadoAt) * 1440 > 1) tVerif.push(dias(p.creadoAt, p.verificadoAt) * 24);
    }
    const primerPago = (e.pagos || []).filter((p) => p.estado === 'verificado').map((p) => p.verificadoAt || p.fecha).sort()[0];
    if (primerPago) for (const it of e.items || []) if (it.compra?.pedidoAt) tPedido.push(Math.max(0, dias(primerPago, it.compra.pedidoAt)));
    const r = resumen(e);
    if (r.margen != null) {
      margenSum += r.margen;
      ventasConCosto += r.total;
    }
  }
  const cotCerradas = cots.filter((c) => ['aceptada', 'rechazada'].includes(c.estado) && String(c.cerrada || c.updatedAt) >= hace90);
  const cotAcept = cotCerradas.filter((c) => c.estado === 'aceptada');
  const tCierre = cotAcept.map((c) => dias(c.creada, c.cerrada || c.updatedAt)).filter((d) => d >= 0);
  const cotAbiertas = cots.filter((c) => resumenCot(c).abierta);
  const carteraTotal = alegra?.cartera?.total || 0;
  const carteraVencida = vencida.reduce((a, f) => a + f.saldo, 0);
  const pm = periodos.mes;
  const kpis = [
    kpi('conversion', 'Cotizaciones aceptadas', cotCerradas.length ? r1((cotAcept.length / cotCerradas.length) * 100) : null, '%', 30, 'mayor', 'De las cotizaciones cerradas (aceptadas o rechazadas), cuántas se vuelven venta. Hacer seguimiento a tiempo es lo que más la sube.', { n: cotCerradas.length }),
    kpi('cierre', 'Días para cerrar una cotización', r1(prom(tCierre)), 'días', 7, 'menor', 'Desde que se registra la cotización hasta que el cliente la acepta.', { n: tCierre.length }),
    kpi('entrega', 'Días para entregar una compra', r1(prom(tEntrega)), 'días', 5, 'menor', 'Desde que se aprueba la venta hasta que el cliente recibe. Entregar rápido trae recompra y referidos.', { n: tEntrega.length }),
    kpi('proyecto', 'Días para poner en marcha un proyecto', r1(prom(tProyecto)), 'días', 30, 'menor', 'Desde la aprobación hasta que el sistema genera. Cada día de retraso aplaza el pago contra instalación.', { n: tProyecto.length }),
    kpi('pedido', 'Días del pago al pedido al proveedor', r1(prom(tPedido)), 'días', 1, 'menor', 'Pedir el mismo día del pago evita quedarse sin existencias y acorta la entrega.', { n: tPedido.length }),
    kpi('verificacion', 'Horas para verificar un pago', r1(prom(tVerif)), 'horas', 24, 'menor', 'Transferencias y consignaciones. Verificar rápido destraba la compra y el aviso al cliente.', { n: tVerif.length }),
    kpi('margen', 'Margen bruto', ventasConCosto ? r1((margenSum / ventasConCosto) * 100) : null, '%', 20, 'mayor', 'Venta menos costo de equipos y otros costos. Requiere llenar el costo interno de cada equipo.'),
    kpi('cartera', 'Cartera vencida (más de 30 días)', carteraTotal ? r1((carteraVencida / carteraTotal) * 100) : null, '%', 20, 'menor', 'Porción de lo facturado en Alegra que lleva más de 30 días sin pagar. Es caja que no está disponible.', { monto: carteraVencida }),
    kpi('detenidas', 'Etapas detenidas 3 días o más', atascadas.length, '', 0, 'menor', 'Ventas trabadas en una etapa. Revisarlas cada mañana evita clientes esperando.'),
    kpi('catalogo', 'Catálogo disponible', publicados ? r1((disp.length / publicados) * 100) : null, '%', 90, 'mayor', 'Equipos publicados con disponibilidad inmediata. Los de pre-orden venden menos.'),
    kpi('ticket', 'Ticket promedio del mes', pm.nVentas ? Math.round(pm.ventas / pm.nVentas) : null, '$', null, null, 'Valor promedio por venta aprobada este mes.'),
    kpi('web', 'Ventas por la tienda web', pm.ventas ? r1((pm.web / pm.ventas) * 100) : null, '%', null, null, 'Parte de las ventas del mes que llega sola por la página (Wompi/Addi).'),
  ];

  return {
    generado: ahora,
    hoy: R.hoy.desde,
    periodos,
    equipos,
    acciones,
    kpis,
    cotizaciones: {
      abiertas: cotAbiertas.length,
      valorAbierto: cotAbiertas.reduce((a, c) => a + (c.total || 0), 0),
      seguimientoHoy: cotSeg.length,
      porEnviar: cots.filter((c) => c.estado === 'por_enviar').length,
      mes: cots.filter((c) => enRango(ymd(c.creada), R.mes)).length,
    },
    activos: { tienda: activos.filter((e) => e.tipo === 'tienda').length, proyectos: activos.filter((e) => e.tipo === 'proyecto').length },
    alegra: alegra ? { guardado: alegra.guardado, cartera: carteraTotal, vencida: carteraVencida, facturadoAnio: alegra.facturadoAnio || null } : null,
  };
}
