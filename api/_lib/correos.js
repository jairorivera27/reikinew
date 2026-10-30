/**
 * Correos automáticos al cliente cuando una etapa que lo involucra cambia de estado.
 * Envío por SMTP (correo de Hostinger, preferido) o, si no hay SMTP, por Resend.
 *
 * Env (SMTP Hostinger):
 *   SMTP_USER        buzón que envía, p. ej. notificaciones@reikisolar.com.co
 *   SMTP_PASS        contraseña de ese buzón
 *   SMTP_HOST        default: smtp.hostinger.com
 *   SMTP_PORT        default: 465 (SSL)
 * Env (alternativa):
 *   RESEND_API_KEY
 * Comunes:
 *   MAIL_FROM        default: "Reiki Energía Solar <SMTP_USER>" o notificaciones@reikisolar.com.co
 *   MAIL_REPLY_TO    default: correo de config/empresa.json
 *   MAIL_BCC         opcional: copia interna de cada correo
 *
 * Regla: los correos NUNCA incluyen proveedores, costos ni notas internas.
 */
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

let empresaCache = null;
function empresa() {
  if (empresaCache) return empresaCache;
  try {
    empresaCache = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config', 'empresa.json'), 'utf8'));
  } catch {
    empresaCache = {
      razon_social: 'Reiki Energía Solar SAS',
      correo: 'info@reikisolar.com.co',
      telefono: '+57 300 405 2638',
      whatsapp_url: 'https://wa.me/573004052638',
      web: 'reikisolar.com.co',
    };
  }
  return empresaCache;
}

const cop = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');

function fechaLarga(ymd) {
  if (!ymd) return '';
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00-05:00`);
  if (Number.isNaN(d.getTime())) return String(ymd);
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' });
}

/**
 * Qué etapa, en qué estado, dispara qué correo.
 * fecha: true → la etapa pide "fecha para el cliente" en el panel y el correo la incluye.
 * requiere: campos sin los cuales no se envía (se registra el motivo).
 */
export const CORREOS = {
  tienda: {
    'verificacion_pago:hecho': {
      asunto: (e) => `Recibimos tu pago — ${ref(e)}`,
      cuerpo: (e, r) => [
        `Confirmamos el pago de tu compra por ${cop(r.pagado)}.`,
        'Ya estamos alistando tus equipos. Te avisaremos cuando estén listos para despacho.',
        'Recuerda que el valor pagado no incluye el envío: te confirmaremos el costo del flete según tu ciudad antes del despacho.',
      ],
    },
    'confirmacion_envio:en_curso': {
      asunto: (e) => `Vamos a despachar tu pedido — ${ref(e)}`,
      cuerpo: (e) => [
        'Tus equipos están listos para despacho. Por favor confirma respondiendo este correo que los datos de entrega son correctos:',
        `Dirección: ${e.cliente?.direccion || '(pendiente)'}${e.cliente?.ciudad ? ', ' + e.cliente.ciudad : ''}`,
        `Celular de contacto: ${e.cliente?.celular || '(pendiente)'}`,
        'Si alguien más recibirá el pedido, indícanos su nombre y celular.',
      ],
    },
    'guia:hecho': {
      requiere: (e) => (e.envio?.guia ? '' : 'falta el número de guía'),
      asunto: (e) => `Tu pedido va en camino — guía ${e.envio.guia}`,
      cuerpo: (e) => [
        'Tu pedido ya fue despachado.',
        `Transportadora: ${e.envio.transportadora || 'por confirmar'}`,
        `Número de guía: ${e.envio.guia}`,
        'Revisa el estado de los empaques al recibir; si notas algún daño, déjalo anotado en la guía y escríbenos.',
      ],
    },
    'entrega:hecho': {
      asunto: (e) => `Pedido entregado — ${ref(e)}`,
      cuerpo: () => [
        'Confirmamos la entrega de tu pedido. ¡Gracias por confiar en Reiki Energía Solar!',
        'Si necesitas apoyo con la instalación, configuración o garantía de tus equipos, responde este correo o escríbenos por WhatsApp.',
      ],
    },
    'factura:hecho': {
      requiere: (e) => (e.factura?.numero ? '' : 'falta el número de factura'),
      asunto: (e) => `Factura electrónica ${e.factura.numero} — Reiki Energía Solar`,
      cuerpo: (e) => [
        `Emitimos la factura electrónica ${e.factura.numero} de tu compra.`,
        'La recibirás (PDF y XML) en este correo desde nuestra plataforma de facturación. Si no la ves, revisa la carpeta de spam o escríbenos.',
      ],
    },
  },
  proyecto: {
    'contrato:hecho': {
      asunto: (e) => `Bienvenido a Reiki — ${e.titulo}`,
      cuerpo: () => [
        '¡Gracias por elegirnos para tu sistema solar! Tu contrato quedó firmado y el proyecto ya está en marcha.',
        'Los siguientes pasos son: anticipo, visita técnica, solicitud de conexión ante el operador de red, compra de equipos e instalación. Te iremos avisando en cada etapa.',
      ],
    },
    'anticipo:hecho': {
      asunto: (e) => `Recibimos tu anticipo — ${e.titulo}`,
      cuerpo: (e, r) => [`Confirmamos la recepción del anticipo. Total recibido a la fecha: ${cop(r.pagado)}.`, 'Con esto programamos la visita técnica y la compra de los equipos.'],
    },
    'visita_tecnica:en_curso': {
      fecha: true,
      requiere: (e, et) => (et.fechaCliente ? '' : 'falta la fecha de la visita'),
      asunto: (e) => `Visita técnica programada — ${e.titulo}`,
      cuerpo: (e, r, et) => [
        `Programamos la visita técnica para el ${fechaLarga(et.fechaCliente)}.`,
        'Revisaremos la cubierta, el tablero eléctrico y el punto de conexión. Por favor ten a mano una factura reciente de energía y permite el acceso al techo y al contador.',
      ],
    },
    'solicitud_or:hecho': {
      asunto: (e) => `Radicamos tu solicitud de conexión — ${e.titulo}`,
      cuerpo: () => ['Radicamos ante el operador de red la solicitud de conexión de tu sistema como autogenerador (AGPE). Te avisaremos cuando el operador responda.'],
    },
    'programacion:hecho': {
      fecha: true,
      requiere: (e, et) => (et.fechaCliente ? '' : 'falta la fecha de instalación'),
      asunto: (e) => `Fecha de instalación — ${e.titulo}`,
      cuerpo: (e, r, et) => [
        `La instalación de tu sistema solar está programada para el ${fechaLarga(et.fechaCliente)}.`,
        'Nuestra cuadrilla necesitará acceso a la cubierta, al tablero eléctrico y un punto de energía. Durante algunos momentos de la conexión puede haber cortes cortos de energía.',
      ],
    },
    'puesta_marcha:hecho': {
      asunto: (e) => `¡Tu sistema solar ya está funcionando! — ${e.titulo}`,
      cuerpo: () => [
        'Terminamos la instalación y la puesta en marcha. Tu sistema ya está generando energía.',
        'Te dejamos configurada la aplicación de monitoreo. Siguen la inspección RETIE y la legalización ante el operador de red; te avisaremos en cada paso.',
      ],
    },
    'pago_instalacion:hecho': {
      asunto: (e) => `Recibimos tu pago — ${e.titulo}`,
      cuerpo: (e, r) => [`Confirmamos el pago correspondiente a la instalación. Total recibido a la fecha: ${cop(r.pagado)}; saldo: ${cop(r.saldo)}.`],
    },
    'retie:hecho': {
      asunto: (e) => `Inspección RETIE aprobada — ${e.titulo}`,
      cuerpo: () => ['Tu sistema aprobó la inspección RETIE. Con el dictamen continuamos la legalización ante el operador de red.'],
    },
    'legalizacion:hecho': {
      asunto: (e) => `Sistema legalizado ante el operador de red — ${e.titulo}`,
      cuerpo: () => ['Tu sistema quedó legalizado como autogenerador con medidor bidireccional. Desde ahora la energía que no consumas se reconoce en tu factura según las reglas del operador.'],
    },
    'pago_final:hecho': {
      asunto: (e) => `Pago final recibido — ${e.titulo}`,
      cuerpo: () => ['Confirmamos el pago final de tu proyecto. ¡Gracias!'],
    },
    'factura:hecho': {
      requiere: (e) => (e.factura?.numero ? '' : 'falta el número de factura'),
      asunto: (e) => `Factura electrónica ${e.factura.numero} — Reiki Energía Solar`,
      cuerpo: (e) => [`Emitimos la factura electrónica ${e.factura.numero} de tu proyecto. La recibirás (PDF y XML) desde nuestra plataforma de facturación.`],
    },
    'entrega_final:hecho': {
      asunto: (e) => `Entrega final de tu proyecto — ${e.titulo}`,
      cuerpo: () => [
        'Hicimos la entrega final de tu sistema: manuales, garantías y acta de entrega.',
        'Recuerda limpiar los paneles con agua (sin químicos) cuando notes polvo acumulado y revisar la app de monitoreo. Ante cualquier novedad, escríbenos.',
      ],
    },
  },
};

function ref(e) {
  return e.cotizacion?.numero || e.titulo || e.id;
}

/** Etapas que piden "fecha para el cliente" en el panel. */
export function etapasConFecha(tipo) {
  return Object.entries(CORREOS[tipo] || {})
    .filter(([, c]) => c.fecha)
    .map(([k]) => k.split(':')[0]);
}

/** Etapas que envían correo (para mostrar el sobre en el panel). */
export function etapasConCorreo(tipo) {
  return Object.keys(CORREOS[tipo] || {});
}

function html(e, parrafos) {
  const em = empresa();
  const nombre = String(e.cliente?.nombre || '').split(' ')[0] || '';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html><html><body style="margin:0;background:#f5eef8;font-family:Arial,Helvetica,sans-serif;color:#1f1230">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#6b2181;padding:18px 24px"><img src="https://www.reikisolar.com.co/images/logo.png" alt="Reiki Energía Solar" height="40" style="display:block"></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">
<p style="margin:0 0 14px">Hola${nombre ? ' ' + esc(nombre) : ''},</p>
${parrafos.map((p) => `<p style="margin:0 0 12px">${esc(p)}</p>`).join('')}
<p style="margin:18px 0 0;font-size:13px;color:#6b5f75">Referencia: ${esc(ref(e))}</p>
</td></tr>
<tr><td style="padding:16px 24px;background:#faf7fc;font-size:12px;color:#6b5f75;line-height:1.5">
${esc(em.razon_social || 'Reiki Energía Solar SAS')} · ${esc(em.ciudad || 'Medellín')}<br>
WhatsApp <a href="${esc(em.whatsapp_url || '')}" style="color:#6b2181">${esc(em.telefono || '')}</a> · <a href="https://${esc(em.web || 'reikisolar.com.co')}" style="color:#6b2181">${esc(em.web || 'reikisolar.com.co')}</a><br>
Puedes responder este correo para hablar con nosotros.
</td></tr></table></td></tr></table></body></html>`;
}

function texto(e, parrafos) {
  const em = empresa();
  const nombre = String(e.cliente?.nombre || '').split(' ')[0] || '';
  return [`Hola${nombre ? ' ' + nombre : ''},`, '', ...parrafos, '', `Referencia: ${ref(e)}`, '', `${em.razon_social} · WhatsApp ${em.telefono} · ${em.web}`].join('\n');
}

export function correoConfigurado() {
  return Boolean((process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);
}

let transporter = null;
async function enviarSmtp({ to, cc, subject, htmlBody, textBody, attachments }) {
  const user = String(process.env.SMTP_USER || '').trim();
  const em = empresa();
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port,
      secure: port === 465,
      auth: { user, pass: process.env.SMTP_PASS },
    });
  }
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || `Reiki Energía Solar <${user}>`,
      to,
      cc: cc || undefined,
      replyTo: process.env.MAIL_REPLY_TO || em.correo || undefined,
      bcc: process.env.MAIL_BCC || undefined,
      subject,
      html: htmlBody,
      text: textBody,
      attachments: attachments && attachments.length ? attachments : undefined,
    });
    return { ok: true, id: info.messageId };
  } catch (err) {
    transporter = null;
    return { ok: false, motivo: `SMTP: ${String(err?.message || err).slice(0, 140)}` };
  }
}

async function enviar(msg) {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return enviarSmtp(msg);
  if (process.env.RESEND_API_KEY) return enviarResend(msg);
  return { ok: false, motivo: 'correo sin configurar (faltan SMTP_USER y SMTP_PASS en Vercel)' };
}

async function enviarResend({ to, cc, subject, htmlBody, textBody, attachments }) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  const em = empresa();
  const body = {
    from: process.env.MAIL_FROM || 'Reiki Energía Solar <notificaciones@reikisolar.com.co>',
    to: [to],
    reply_to: process.env.MAIL_REPLY_TO || em.correo || 'info@reikisolar.com.co',
    subject,
    html: htmlBody,
    text: textBody,
  };
  if (process.env.MAIL_BCC) body.bcc = [process.env.MAIL_BCC];
  if (cc) body.cc = [cc];
  if (attachments && attachments.length)
    body.attachments = attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString('base64') }));
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, motivo: `Resend ${r.status}: ${String(j.message || j.error || '').slice(0, 120)}` };
    return { ok: true, id: j.id };
  } catch (err) {
    return { ok: false, motivo: String(err?.message || err).slice(0, 120) };
  }
}

/**
 * Envía el correo de la etapa si corresponde. Muta exp.correos (registro) y devuelve
 * { enviado, motivo } o null si la etapa no tiene correo. No reenvía lo ya enviado.
 */
export async function correoPorEtapa(exp, etapa, resumenExp) {
  const regla = (CORREOS[exp.tipo] || {})[`${etapa.key}:${etapa.estado}`];
  if (!regla) return null;
  const clave = `${etapa.key}:${etapa.estado}`;
  exp.correos = exp.correos || [];
  if (exp.correos.some((c) => c.clave === clave && c.estado === 'enviado')) return { enviado: false, motivo: 'ya se había enviado' };

  let motivo = '';
  if (exp.correosActivos === false) motivo = 'correos desactivados para este cliente';
  else if (!exp.cliente?.correo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(exp.cliente.correo)) motivo = 'el cliente no tiene correo';
  else if (regla.requiere) motivo = regla.requiere(exp, etapa) || '';

  const asunto = motivo ? '' : regla.asunto(exp, resumenExp, etapa);
  let res = { ok: false, motivo };
  if (!motivo) {
    const parrafos = regla.cuerpo(exp, resumenExp, etapa);
    res = await enviar({ to: exp.cliente.correo, subject: asunto, htmlBody: html(exp, parrafos), textBody: texto(exp, parrafos) });
  }
  exp.correos.unshift({
    clave,
    etapa: etapa.label,
    para: exp.cliente?.correo || '',
    asunto,
    estado: res.ok ? 'enviado' : 'no_enviado',
    motivo: res.ok ? '' : res.motivo,
    at: new Date().toISOString(),
  });
  exp.correos = exp.correos.slice(0, 50);
  return { enviado: !!res.ok, motivo: res.ok ? '' : res.motivo, asunto };
}

/** Cuerpo libre (texto plano) → HTML con la misma plantilla de Reiki. Respeta párrafos, viñetas y saltos de línea. */
function htmlLibre(cuerpo) {
  const em = empresa();
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bloques = String(cuerpo || '')
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const lineas = b.split('\n');
      const vinetas = lineas.filter((l) => /^\s*[•\-–*]\s+/.test(l));
      if (vinetas.length && vinetas.length >= lineas.length - 1) {
        const titulo = /^\s*[•\-–*]\s+/.test(lineas[0]) ? '' : `<p style="margin:0 0 6px">${esc(lineas[0])}</p>`;
        const items = lineas
          .filter((l) => /^\s*[•\-–*]\s+/.test(l))
          .map((l) => `<li style="margin:0 0 4px">${esc(l.replace(/^\s*[•\-–*]\s+/, ''))}</li>`)
          .join('');
        return `${titulo}<ul style="margin:0 0 12px;padding-left:20px">${items}</ul>`;
      }
      return `<p style="margin:0 0 12px">${lineas.map(esc).join('<br>')}</p>`;
    })
    .join('');
  return `<!doctype html><html><body style="margin:0;background:#f5eef8;font-family:Arial,Helvetica,sans-serif;color:#1f1230">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#6b2181;padding:18px 24px"><img src="https://www.reikisolar.com.co/images/logo.png" alt="Reiki Energía Solar" height="40" style="display:block"></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">${bloques}</td></tr>
<tr><td style="padding:16px 24px;background:#faf7fc;font-size:12px;color:#6b5f75;line-height:1.5">
${esc(em.razon_social || 'Reiki Energía Solar SAS')} · <a href="https://${esc(em.web || 'reikisolar.com.co')}" style="color:#6b2181">${esc(em.web || 'reikisolar.com.co')}</a>
</td></tr></table></td></tr></table></body></html>`;
}

/**
 * Correo redactado a mano para el cliente del expediente (confirmaciones, avisos especiales).
 * Muta exp.correos. No incluye nada interno: el texto es exactamente el que se envía.
 */
export async function correoLibre(exp, { asunto, cuerpo, cc } = {}) {
  const subject = String(asunto || '').trim().slice(0, 200);
  const texto = String(cuerpo || '').trim().slice(0, 12000);
  exp.correos = exp.correos || [];
  let motivo = '';
  if (!subject || !texto) motivo = 'falta asunto o texto';
  else if (!exp.cliente?.correo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(exp.cliente.correo)) motivo = 'el cliente no tiene correo';
  const ccOk = cc && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(cc).trim()) ? String(cc).trim() : '';
  const res = motivo ? { ok: false, motivo } : await enviar({ to: exp.cliente.correo, cc: ccOk, subject, htmlBody: htmlLibre(texto), textBody: texto });
  exp.correos.unshift({
    clave: `libre:${Date.now()}`,
    etapa: 'Correo redactado',
    para: exp.cliente?.correo || '',
    asunto: subject,
    estado: res.ok ? 'enviado' : 'no_enviado',
    motivo: res.ok ? '' : res.motivo,
    at: new Date().toISOString(),
  });
  exp.correos = exp.correos.slice(0, 50);
  return { enviado: !!res.ok, motivo: res.ok ? '' : res.motivo, asunto: subject };
}

/** Correo libre con adjuntos (cotizaciones). No toca expedientes. */
export async function enviarConAdjunto({ to, cc, subject, cuerpo, adjuntos = [] } = {}) {
  if (!String(subject || '').trim() || !String(cuerpo || '').trim()) return { ok: false, motivo: 'falta asunto o texto' };
  return enviar({ to, cc: cc || '', subject: String(subject).trim(), htmlBody: htmlLibre(cuerpo), textBody: String(cuerpo).trim(), attachments: adjuntos });
}
