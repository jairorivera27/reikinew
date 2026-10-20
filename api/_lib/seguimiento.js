/**
 * Seguimiento de ventas aprobadas: "Compras en tienda" y "Proyectos" (instalaciones).
 * Cada expediente guarda cliente, ítems con proveedor, pagos, envío, factura y etapas.
 * Persistencia: Upstash Redis (sin vencimiento) + memoria de proceso como respaldo.
 */
import { getRedis, waKey } from './whatsapp-redis.js';
import { proveedorDeItem } from './proveedores.js';
import { correoPorEtapa } from './correos.js';

const memExp = globalThis.__reikiSegExp || new Map();
globalThis.__reikiSegExp = memExp;

const IDX_KEY = waKey('segidx', 'all');

export const ESTADOS_ETAPA = ['pendiente', 'en_curso', 'hecho', 'no_aplica'];

/** Etapas por tipo. `ayuda` = qué hay que hacer para cerrarla. */
export const PLANTILLAS = {
  tienda: [
    { key: 'datos_facturacion', label: 'Datos del cliente para facturar', ayuda: 'Nombre o razón social, cédula/NIT, RUT si es empresa, correo para la factura electrónica, celular y dirección de entrega.' },
    { key: 'verificacion_pago', label: 'Verificación de pagos', ayuda: 'Confirmar que el dinero llegó a la cuenta (Wompi/Addi se confirman solos; transferencias y consignaciones se revisan en el banco).' },
    { key: 'disponibilidad', label: 'Disponibilidad de los equipos', ayuda: 'Confirmar existencias con el proveedor de cada equipo antes de comprar.' },
    { key: 'compra_proveedor', label: 'Compra a proveedores', ayuda: 'Pedir y pagar los equipos a cada proveedor; guardar su factura o remisión.' },
    { key: 'confirmacion_envio', label: 'Confirmación del envío con el cliente', ayuda: 'Confirmar dirección, ciudad, quién recibe, horario y valor del flete.' },
    { key: 'coordinacion_envio', label: 'Coordinación del envío', ayuda: 'Acordar con el proveedor o la transportadora el despacho (directo del proveedor o desde bodega).' },
    { key: 'guia', label: 'Envío del número de guía', ayuda: 'Enviar al cliente la transportadora y el número de guía.' },
    { key: 'entrega', label: 'Entrega', ayuda: 'Confirmar con el cliente que recibió completo y en buen estado.' },
    { key: 'factura', label: 'Generación de la factura', ayuda: 'Emitir la factura electrónica con los datos del cliente y enviarla al correo.' },
  ],
  proyecto: [
    { key: 'contrato', label: 'Aprobación y firma del contrato', ayuda: 'Cotización aprobada, contrato de suministro e instalación firmado por ambas partes.' },
    { key: 'polizas', label: 'Pólizas del contrato', ayuda: 'Solo si el contrato las exige (cumplimiento, anticipo, calidad). Si no, dejar en "No aplica".', estadoInicial: 'no_aplica' },
    { key: 'datos_facturacion', label: 'Datos del cliente para facturar', ayuda: 'Cédula/NIT, RUT, correo de facturación, dirección del predio y número de cuenta o contrato del operador de red.' },
    { key: 'anticipo', label: 'Verificación del anticipo', ayuda: 'Confirmar en el banco el pago del anticipo pactado (p. ej. 60 %).' },
    { key: 'visita_tecnica', label: 'Visita técnica e ingeniería de detalle', ayuda: 'Verificar tensión de red, estado de la cubierta, punto de conexión, recorridos de cable; ajustar diseño y diagrama unifilar.' },
    { key: 'solicitud_or', label: 'Solicitud de conexión ante el operador de red', ayuda: 'Radicar la solicitud AGPE (formulario, unifilar, fichas técnicas) ante EPM, Afinia, Emcali u otro operador.' },
    { key: 'disponibilidad', label: 'Disponibilidad de los equipos', ayuda: 'Confirmar existencias de paneles, inversor, baterías y protecciones con cada proveedor.' },
    { key: 'compra_proveedor', label: 'Compra de equipos a proveedores', ayuda: 'Pedir y pagar equipos, estructura y materiales eléctricos.' },
    { key: 'logistica', label: 'Despacho de equipos a la obra', ayuda: 'Coordinar transporte de equipos y materiales al sitio y confirmar recepción completa.' },
    { key: 'programacion', label: 'Programación de cuadrilla', ayuda: 'Fecha de instalación acordada con el cliente, cuadrilla, herramientas, alturas y viáticos.' },
    { key: 'instalacion', label: 'Instalación', ayuda: 'Estructura, paneles, inversor, protecciones DC/AC, tablero, cableado y puesta a tierra.' },
    { key: 'puesta_marcha', label: 'Puesta en marcha y pruebas', ayuda: 'Pruebas de strings y aislamiento, configuración del inversor y del monitoreo en la app del cliente.' },
    { key: 'pago_instalacion', label: 'Verificación del pago contra instalación', ayuda: 'Confirmar el pago pactado al terminar la instalación (p. ej. 30 %).' },
    { key: 'retie', label: 'Inspección y dictamen RETIE', ayuda: 'Programar al inspector, corregir observaciones y obtener el dictamen.' },
    { key: 'legalizacion', label: 'Legalización AGPE ante el operador', ayuda: 'Entrega del dictamen, cambio o programación del medidor bidireccional y visita del operador de red.' },
    { key: 'pago_final', label: 'Verificación del pago final', ayuda: 'Confirmar el saldo final (p. ej. 10 % contra legalización).' },
    { key: 'factura', label: 'Generación de la factura', ayuda: 'Emitir la factura electrónica y enviarla al correo de facturación.' },
    { key: 'entrega_final', label: 'Entrega final al cliente', ayuda: 'Manuales, garantías, acta de entrega y capacitación de uso y monitoreo.' },
  ],
};

function nowIso() {
  return new Date().toISOString();
}

function todayCompact() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).replace(/-/g, '');
}

function rid(n = 4) {
  return Math.random().toString(36).slice(2, 2 + n);
}

function str(v, max = 400) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : 0;
  const n = Number(String(v || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function expKey(id) {
  return waKey('seg', id);
}

function orderLinkKey(orderId) {
  return waKey('segorder', orderId);
}

function etapasIniciales(tipo) {
  return (PLANTILLAS[tipo] || PLANTILLAS.tienda).map((p) => ({
    key: p.key,
    label: p.label,
    estado: p.estadoInicial || 'pendiente',
    fecha: null,
    nota: '',
  }));
}

function normItem(it) {
  const nombre = str(it.nombre || it.name || it.title, 300);
  const sku = str(it.sku || it.slug || it.id, 200);
  const prov = proveedorDeItem({ sku, name: nombre });
  const proveedor = str(it.proveedor, 80) || prov.proveedor;
  return {
    nombre,
    sku,
    cantidad: Math.max(1, num(it.cantidad ?? it.quantity ?? 1)),
    precioUnit: num(it.precioUnit ?? it.unitPrice ?? it.precio ?? it.price),
    proveedor,
    codigoProveedor: str(it.codigoProveedor, 80) || prov.codigoProveedor || '',
    disponibilidad: str(it.disponibilidad, 120),
  };
}

function normPago(p) {
  return {
    id: str(p.id, 20) || rid(6),
    fecha: str(p.fecha, 30) || nowIso().slice(0, 10),
    monto: num(p.monto),
    medio: str(p.medio, 60) || 'transferencia',
    referencia: str(p.referencia, 120),
    estado: p.estado === 'verificado' ? 'verificado' : 'por_verificar',
    nota: str(p.nota, 300),
  };
}

/** Totales de pago y siguiente paso (no se guardan, se calculan). */
export function resumen(exp) {
  const total = num(exp.total) || (exp.items || []).reduce((a, it) => a + it.precioUnit * it.cantidad, 0);
  const pagos = exp.pagos || [];
  const pagado = pagos.filter((p) => p.estado === 'verificado').reduce((a, p) => a + p.monto, 0);
  const porVerificar = pagos.filter((p) => p.estado !== 'verificado').reduce((a, p) => a + p.monto, 0);
  const saldo = Math.max(0, total - pagado);
  let estadoPago = 'sin_pago';
  if (total > 0 && pagado >= total) estadoPago = 'completo';
  else if (pagado > 0) estadoPago = 'parcial';
  if (estadoPago !== 'completo' && porVerificar > 0) estadoPago = estadoPago === 'sin_pago' ? 'por_verificar' : 'parcial_por_verificar';

  const etapas = exp.etapas || [];
  const activas = etapas.filter((e) => e.estado !== 'no_aplica');
  const hechas = activas.filter((e) => e.estado === 'hecho').length;
  const siguiente = etapas.find((e) => e.estado === 'en_curso') || etapas.find((e) => e.estado === 'pendiente') || null;
  const plantilla = (PLANTILLAS[exp.tipo] || []).find((p) => siguiente && p.key === siguiente.key);

  const proveedores = {};
  (exp.items || []).forEach((it) => {
    const p = it.proveedor || 'Por confirmar';
    (proveedores[p] = proveedores[p] || []).push(`${it.cantidad} × ${it.nombre}`);
  });

  return {
    total,
    pagado,
    porVerificar,
    saldo,
    estadoPago,
    avance: activas.length ? Math.round((hechas / activas.length) * 100) : 0,
    hechas,
    totalEtapas: activas.length,
    siguiente: siguiente
      ? { key: siguiente.key, label: siguiente.label, estado: siguiente.estado, ayuda: plantilla ? plantilla.ayuda : '' }
      : null,
    proveedores,
  };
}

/** Marca automáticamente lo que se puede deducir sin pisar lo que el equipo cambió a mano. */
function autoEtapas(exp) {
  const r = resumen(exp);
  const set = (key, estado, nota) => {
    const e = exp.etapas.find((x) => x.key === key);
    if (e && e.estado === 'pendiente') {
      e.estado = estado;
      e.fecha = nowIso();
      if (nota && !e.nota) e.nota = nota;
    }
  };
  const c = exp.cliente || {};
  if (c.nombre && c.documento && c.correo) set('datos_facturacion', 'hecho', 'Datos completos registrados.');
  if (exp.tipo === 'tienda' && r.estadoPago === 'completo') set('verificacion_pago', 'hecho', 'Pago total verificado.');
  if (exp.envio && exp.envio.guia) set('guia', 'en_curso', `Guía ${exp.envio.guia} registrada; falta avisar al cliente.`);
  if (exp.factura && exp.factura.numero) set('factura', 'hecho', `Factura ${exp.factura.numero}.`);
}

function pushHist(exp, by, texto) {
  exp.historial = [{ at: nowIso(), by: str(by, 40) || 'panel', texto: str(texto, 300) }, ...(exp.historial || [])].slice(0, 80);
}

async function persist(exp) {
  exp.updatedAt = nowIso();
  memExp.set(exp.id, exp);
  const redis = getRedis();
  if (redis) {
    await redis.set(expKey(exp.id), exp);
    await redis.sadd(IDX_KEY, exp.id);
  }
  return exp;
}

export async function getExpediente(id) {
  const k = str(id, 60);
  if (!k) return null;
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(expKey(k));
      if (raw) {
        const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
        memExp.set(k, v);
        return v;
      }
    } catch (err) {
      console.warn('[seguimiento] get', err?.message || err);
    }
  }
  return memExp.get(k) || null;
}

export async function listExpedientes() {
  const redis = getRedis();
  let ids = [];
  if (redis) {
    try {
      ids = (await redis.smembers(IDX_KEY)) || [];
    } catch (err) {
      console.warn('[seguimiento] smembers', err?.message || err);
    }
  }
  if (!ids.length) ids = Array.from(memExp.keys());
  const out = [];
  for (const id of ids) {
    const e = await getExpediente(id);
    if (e) out.push(e);
  }
  out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return out;
}

/**
 * Crea o actualiza. Campos aceptados: tipo, titulo, cliente, cotizacion, total, items, pagos,
 * condicionesPago, envio, factura, notas, estado, orderId, origen.
 */
export async function saveExpediente(input = {}, by = 'panel') {
  const prev = input.id ? await getExpediente(input.id) : null;
  const tipo = prev ? prev.tipo : input.tipo === 'proyecto' ? 'proyecto' : 'tienda';
  const exp = prev
    ? { ...prev }
    : {
        id: `${tipo === 'proyecto' ? 'P' : 'T'}-${todayCompact()}-${rid(4)}`,
        tipo,
        etapas: etapasIniciales(tipo),
        pagos: [],
        items: [],
        historial: [],
        estado: 'activo',
        notificado: false,
        origen: str(input.origen, 30) || 'panel',
        createdAt: nowIso(),
      };

  if (input.titulo !== undefined) exp.titulo = str(input.titulo, 200);
  if (input.cliente) {
    const c = input.cliente;
    exp.cliente = {
      ...(exp.cliente || {}),
      ...Object.fromEntries(
        ['nombre', 'documento', 'tipoDoc', 'ciudad', 'direccion', 'celular', 'correo', 'contacto']
          .filter((f) => c[f] !== undefined)
          .map((f) => [f, str(c[f], 200)])
      ),
    };
  }
  if (input.cotizacion) {
    exp.cotizacion = { ...(exp.cotizacion || {}), numero: str(input.cotizacion.numero ?? exp.cotizacion?.numero, 60), fecha: str(input.cotizacion.fecha ?? exp.cotizacion?.fecha, 30), url: str(input.cotizacion.url ?? exp.cotizacion?.url, 500) };
  }
  if (input.total !== undefined) exp.total = num(input.total);
  if (Array.isArray(input.items)) exp.items = input.items.map(normItem).filter((i) => i.nombre);
  if (Array.isArray(input.pagos)) exp.pagos = input.pagos.map(normPago).filter((p) => p.monto > 0);
  if (input.condicionesPago !== undefined) exp.condicionesPago = str(input.condicionesPago, 120);
  if (input.envio) exp.envio = { ...(exp.envio || {}), ...Object.fromEntries(['transportadora', 'guia', 'fechaDespacho', 'destino', 'valorFlete'].filter((f) => input.envio[f] !== undefined).map((f) => [f, str(input.envio[f], 120)])) };
  if (input.factura) exp.factura = { ...(exp.factura || {}), numero: str(input.factura.numero ?? exp.factura?.numero, 60), fecha: str(input.factura.fecha ?? exp.factura?.fecha, 30) };
  if (input.notas !== undefined) exp.notas = str(input.notas, 2000);
  if (input.estado && ['activo', 'cerrado', 'cancelado'].includes(input.estado)) exp.estado = input.estado;
  if (input.orderId) exp.orderId = str(input.orderId, 80);
  if (!exp.titulo) exp.titulo = exp.cliente?.nombre || exp.cotizacion?.numero || exp.id;

  if (input.correosActivos !== undefined) exp.correosActivos = Boolean(input.correosActivos);

  const antes = snapshot(exp);
  autoEtapas(exp);
  pushHist(exp, by, prev ? 'Expediente actualizado.' : `Expediente creado (${tipo === 'proyecto' ? 'proyecto' : 'compra en tienda'}).`);
  if (!input._sinCorreoInicial) await notificarCambios(exp, antes, by);
  return persist(exp);
}

export async function updateEtapa(id, key, { estado, nota, fechaCliente } = {}, by = 'panel') {
  const exp = await getExpediente(id);
  if (!exp) return null;
  const e = (exp.etapas || []).find((x) => x.key === key);
  if (!e) throw new Error('etapa_desconocida');
  const antes = snapshot(exp);
  if (fechaCliente !== undefined) e.fechaCliente = str(fechaCliente, 10);
  if (estado) {
    if (!ESTADOS_ETAPA.includes(estado)) throw new Error('estado_invalido');
    if (e.estado !== estado) {
      e.estado = estado;
      e.fecha = nowIso();
    }
  }
  if (nota !== undefined) e.nota = str(nota, 600);
  pushHist(exp, by, `Etapa "${e.label}" → ${e.estado}${nota ? `: ${str(nota, 120)}` : ''}`);
  // Si solo se agregó la fecha a una etapa ya marcada, reintenta su correo
  if (fechaCliente && !estado) antes[e.key] = '';
  await notificarCambios(exp, antes, by);
  return persist(exp);
}

/** Reintenta el correo de una etapa en su estado actual (p. ej. tras completar el correo del cliente). */
export async function reenviarCorreo(id, key, by = 'panel') {
  const exp = await getExpediente(id);
  if (!exp) return null;
  const e = (exp.etapas || []).find((x) => x.key === key);
  if (!e) throw new Error('etapa_desconocida');
  const r = await correoPorEtapa(exp, e, resumen(exp));
  if (!r) throw new Error('esta etapa no envía correo en su estado actual');
  pushHist(exp, by, r.enviado ? `Correo enviado al cliente: "${r.asunto}"` : `Correo no enviado (${e.label}): ${r.motivo}`);
  return persist(exp);
}

function snapshot(exp) {
  return Object.fromEntries((exp.etapas || []).map((e) => [e.key, e.estado]));
}

async function notificarCambios(exp, antes, by) {
  const r = resumen(exp);
  for (const e of exp.etapas || []) {
    if (antes[e.key] === e.estado) continue;
    try {
      const out = await correoPorEtapa(exp, e, r);
      if (out && out.motivo !== 'ya se había enviado') {
        pushHist(exp, by, out.enviado ? `Correo enviado al cliente: "${out.asunto}"` : `Correo no enviado (${e.label}): ${out.motivo}`);
      }
    } catch (err) {
      console.warn('[seguimiento] correo', err?.message || err);
    }
  }
}

export async function addPago(id, pago, by = 'panel') {
  const exp = await getExpediente(id);
  if (!exp) return null;
  const p = normPago(pago || {});
  if (!p.monto) throw new Error('monto_obligatorio');
  const i = (exp.pagos || []).findIndex((x) => x.id === p.id);
  if (i >= 0) exp.pagos[i] = p;
  else exp.pagos = [...(exp.pagos || []), p];
  const antes = snapshot(exp);
  autoEtapas(exp);
  await notificarCambios(exp, antes, by);
  pushHist(exp, by, `Pago ${p.estado === 'verificado' ? 'verificado' : 'por verificar'}: $${p.monto.toLocaleString('es-CO')} (${p.medio}).`);
  return persist(exp);
}

/** Pedido web aprobado (Wompi/Addi) → expediente de compra en tienda, una sola vez. */
export async function expedienteDesdePedido(order) {
  if (!order || !order.orderId) return null;
  const redis = getRedis();
  const link = orderLinkKey(order.orderId);
  if (redis) {
    const ya = await redis.get(link);
    if (ya) return null;
    const ok = await redis.set(link, 'creando', { nx: true });
    if (!ok) return null;
  }
  const c = order.client || {};
  const dir = order.shippingAddress || {};
  const exp = await saveExpediente(
    {
      tipo: 'tienda',
      origen: 'web',
      orderId: order.orderId,
      // Pedidos web viejos (más de 48 h): no mandar correos de etapas ya cumplidas al crearlos
      _sinCorreoInicial: Date.now() - (Date.parse(order.paidAt || order.updatedAt || order.createdAt || '') || 0) > 48 * 3600000,
      titulo: c.fullName || order.orderId,
      cliente: {
        nombre: c.fullName,
        documento: c.idNumber,
        tipoDoc: c.idType,
        celular: c.phone,
        correo: c.email,
        ciudad: [dir.city, dir.department].filter(Boolean).join(', '),
        direccion: dir.lineOne || dir.address || '',
      },
      cotizacion: { numero: `Pedido web ${order.orderId}`, fecha: String(order.createdAt || '').slice(0, 10) },
      total: order.totalAmount,
      items: (order.items || []).map((it) => ({ nombre: it.name, sku: it.sku, cantidad: it.quantity, precioUnit: it.unitPrice })),
      pagos: [
        {
          fecha: String(order.paidAt || order.updatedAt || order.createdAt || '').slice(0, 10),
          monto: order.totalAmount,
          medio: order.gateway === 'addi' ? 'Addi' : 'Wompi',
          referencia: order.wompiTransactionId || order.addiApplicationId || order.orderId,
          estado: 'verificado',
          nota: 'Aprobado por la pasarela.',
        },
      ],
    },
    'tienda web'
  );
  if (redis) await redis.set(link, exp.id);
  return exp;
}
