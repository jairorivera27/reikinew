/**
 * Encuesta de satisfacción al cliente (se envía al cerrar la etapa de entrega).
 * Enlace firmado por venta: /encuesta?id=<venta>&t=<firma>. Las respuestas quedan en exp.encuesta.
 */
import crypto from 'node:crypto';

const SITIO = 'https://www.reikisolar.com.co';

/** Aspectos que se califican de 1 a 5 (los de proyecto incluyen la instalación). */
export const ASPECTOS = {
  tienda: [
    ['asesoria', 'Asesoría y atención'],
    ['precio', 'Claridad de la cotización y el precio'],
    ['tiempo', 'Tiempo de entrega'],
    ['estado', 'Estado de los equipos al recibirlos'],
    ['comunicacion', 'Comunicación y seguimiento del pedido'],
    ['pago', 'Proceso de pago y factura'],
  ],
  proyecto: [
    ['asesoria', 'Asesoría y diseño del sistema'],
    ['precio', 'Claridad de la propuesta y el precio'],
    ['tiempo', 'Cumplimiento de los tiempos'],
    ['instalacion', 'Calidad de la instalación'],
    ['equipo', 'Trato y orden del equipo técnico'],
    ['comunicacion', 'Comunicación durante el proyecto'],
    ['pago', 'Proceso de pago y factura'],
  ],
};

/** Qué hacer cuando un aspecto sale bajo (oportunidades de mejora sugeridas en el panel). */
export const ESTRATEGIAS = {
  asesoria: 'Guion de asesoría con preguntas de consumo y uso; responder WhatsApp en menos de 1 hora; enviar ficha técnica con cada propuesta.',
  precio: 'Cotización con desglose claro (equipos, envío, IVA) y validez visible; explicar en una línea por qué cada equipo.',
  tiempo: 'Confirmar disponibilidad con el proveedor antes de cobrar; prometer fechas con margen; avisar proactivamente cualquier atraso.',
  estado: 'Revisar y fotografiar equipos antes del despacho; embalaje reforzado para paneles; seguro de transporte en envíos de alto valor.',
  comunicacion: 'Aviso automático en cada etapa (correo + WhatsApp); responsable único por pedido; reporte de guía el mismo día del despacho.',
  pago: 'Facturar apenas se confirma el pago; enviar factura y soporte de pago en el mismo correo; más medios de pago (Bre-B, Addi).',
  instalacion: 'Lista de chequeo RETIE en cada obra; fotos del antes y después; prueba de funcionamiento con el cliente presente.',
  equipo: 'Protocolo de presentación, orden y limpieza en obra; inducción al cliente al terminar; evaluación interna de cuadrillas.',
};

function secreto() {
  return String(process.env.ENCUESTA_SECRET || process.env.CLAUDE_AGENT_TOKEN || process.env.ADMIN_TOKEN || '').trim();
}

export function firmaEncuesta(id) {
  const s = secreto();
  if (!s || !id) return '';
  return crypto.createHmac('sha256', s).update(`reiki-encuesta-v1:${id}`).digest('base64url').slice(0, 22);
}

export function firmaValida(id, t) {
  const esperado = firmaEncuesta(id);
  if (!esperado || !t || String(t).length !== esperado.length) return false;
  return crypto.timingSafeEqual(Buffer.from(String(t)), Buffer.from(esperado));
}

export function urlEncuesta(id) {
  const t = firmaEncuesta(id);
  return t ? `${SITIO}/encuesta?id=${encodeURIComponent(id)}&t=${t}` : '';
}

/** Valida y normaliza lo que manda el cliente. */
export function normalizarRespuestas(tipo, body = {}) {
  const nps = Number(body.nps);
  if (!Number.isInteger(nps) || nps < 0 || nps > 10) throw new Error('Falta la calificación de 0 a 10.');
  const calif = {};
  for (const [k] of ASPECTOS[tipo === 'proyecto' ? 'proyecto' : 'tienda']) {
    const v = Number((body.calificaciones || {})[k]);
    if (Number.isInteger(v) && v >= 1 && v <= 5) calif[k] = v;
  }
  const txt = (x, n) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, n);
  return {
    nps,
    calificaciones: calif,
    gusto: txt(body.gusto, 800),
    mejorar: txt(body.mejorar, 800),
    publicar: body.publicar === true || body.publicar === 'si',
  };
}

const categoriaNps = (n) => (n >= 9 ? 'promotor' : n >= 7 ? 'pasivo' : 'detractor');

/** Resumen para el panel: NPS, promedio por aspecto, oportunidades de mejora, clientes por contactar y comentarios. */
export function resumenEncuestas(expedientes = []) {
  const enviadas = expedientes.filter((e) => e.encuesta?.enviadaAt);
  const resp = expedientes.filter((e) => e.encuesta?.respuesta);
  const n = resp.length;
  const cuenta = { promotor: 0, pasivo: 0, detractor: 0 };
  const sum = {};
  const cnt = {};
  for (const e of resp) {
    const r = e.encuesta.respuesta;
    cuenta[categoriaNps(r.nps)] += 1;
    for (const [k, v] of Object.entries(r.calificaciones || {})) {
      sum[k] = (sum[k] || 0) + v;
      cnt[k] = (cnt[k] || 0) + 1;
    }
  }
  const nombres = Object.fromEntries([...ASPECTOS.tienda, ...ASPECTOS.proyecto]);
  const aspectos = Object.keys(sum)
    .map((k) => ({ key: k, label: nombres[k] || k, promedio: Math.round((sum[k] / cnt[k]) * 10) / 10, respuestas: cnt[k] }))
    .sort((a, b) => a.promedio - b.promedio);
  const oportunidades = aspectos
    .filter((a) => a.promedio < 4.5)
    .slice(0, 3)
    .map((a) => ({ ...a, estrategia: ESTRATEGIAS[a.key] || '' }));
  const fila = (e) => ({
    id: e.id,
    cliente: e.cliente?.nombre || '',
    celular: e.cliente?.celular || '',
    referencia: e.cotizacion?.numero || e.titulo || e.id,
    tipo: e.tipo,
    enviadaAt: e.encuesta?.enviadaAt || '',
    respondidaAt: e.encuesta?.respondidaAt || '',
    nps: e.encuesta?.respuesta?.nps,
    categoria: e.encuesta?.respuesta ? categoriaNps(e.encuesta.respuesta.nps) : '',
    gusto: e.encuesta?.respuesta?.gusto || '',
    mejorar: e.encuesta?.respuesta?.mejorar || '',
    publicar: !!e.encuesta?.respuesta?.publicar,
    url: urlEncuesta(e.id),
  });
  const porFecha = (a, b) => String(b.respondidaAt || b.enviadaAt).localeCompare(String(a.respondidaAt || a.enviadaAt));
  return {
    enviadas: enviadas.length,
    respondidas: n,
    tasaRespuesta: enviadas.length ? Math.round((n / enviadas.length) * 100) : 0,
    nps: n ? Math.round(((cuenta.promotor - cuenta.detractor) / n) * 100) : null,
    cuenta,
    aspectos,
    oportunidades,
    porContactar: resp.filter((e) => categoriaNps(e.encuesta.respuesta.nps) === 'detractor' && !e.encuesta.contactadoAt).map(fila).sort(porFecha),
    comentarios: resp.filter((e) => e.encuesta.respuesta.gusto || e.encuesta.respuesta.mejorar).map(fila).sort(porFecha).slice(0, 30),
    sinResponder: enviadas.filter((e) => !e.encuesta.respuesta).map(fila).sort(porFecha).slice(0, 30),
  };
}
