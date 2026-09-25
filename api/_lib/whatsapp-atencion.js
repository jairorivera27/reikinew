/**
 * Atención personalizada (ingeniero / comprobantes) + mensajes de handoff / pausa.
 * Espejo de src/config/atencion.ts para el runtime del webhook (JS).
 */
import { getRedis, waKey } from './whatsapp-redis.js';
import { handoffTimingPhrase } from './whatsapp-horario.js';
import { sendCtaUrl, sendText } from './whatsapp.js';

const fromEnv = String(process.env.ATTENTION_WHATSAPP || '')
  .replace(/\D/g, '')
  .trim();

export const ATTENTION_PHONE_E164 = fromEnv || '573245737413';
export const ATTENTION_PHONE_DISPLAY = '+57 324 573 7413';
export const ATTENTION_WHATSAPP_URL = `https://wa.me/${ATTENTION_PHONE_E164}`;

export function attentionWhatsAppUrl(prefillText = '') {
  const t = String(prefillText || '').trim();
  if (!t) return ATTENTION_WHATSAPP_URL;
  return `${ATTENTION_WHATSAPP_URL}?text=${encodeURIComponent(t)}`;
}

export const HABEAS_DATA_MSG =
  'Para que el ingeniero te contacte, te pediré unos datos. Al compartirlos autorizas su tratamiento según nuestra política: https://reikisolar.com.co/politica-privacidad';

export const MEDIA_RECEIVED_MSG =
  '¡Recibido! 📎 Si es un comprobante de pago, envíalo al +57 324 573 7413. Si es tu factura de energía, cuéntame el valor o los kWh y te oriento.';

export const PAUSE_NOTICE_BODY =
  'Tu caso ya lo tiene nuestro ingeniero experto en diseño fotovoltaico. Te escribirá desde el +57 324 573 7413. Si prefieres, escríbele tú directamente 👇\n\n' +
  '(Para volver al asistente: *menú*)';

const CTA_LABEL = 'Escribir al ingeniero';

/** @type {Map<string, true>} */
const pauseNoticeMem = globalThis.__reikiWaPauseNotice || new Map();
globalThis.__reikiWaPauseNotice = pauseNoticeMem;

/** @type {Map<string, true>} */
const habeasMem = globalThis.__reikiWaHabeas || new Map();
globalThis.__reikiWaHabeas = habeasMem;

/**
 * Cuerpo de cierre unificado (IA + reglas). Sin "por este chat" ni "escribe hola".
 * @param {{ nombre?: string, cotizacionNumero?: string }} opts
 */
export function buildHandoffBody(opts = {}) {
  const nombre = String(opts.nombre || '').trim();
  const first = nombre.split(/\s+/)[0] || '';
  const timing = handoffTimingPhrase();
  const hello = first ? `¡Listo, *${first}*! 🙌 ` : '¡Listo! 🙌 ';
  return (
    `${hello}Ya le pasé tu información a nuestro *ingeniero experto en diseño fotovoltaico*. ` +
    `Te escribirá ${timing} desde el *${ATTENTION_PHONE_DISPLAY}* para darte una asesoría personalizada y sin costo. ` +
    `Si prefieres, puedes escribirle tú directamente aquí 👇`
  );
}

function engineerPrefill(nombre, cotizacionNumero) {
  const n = String(nombre || '').trim() || 'cliente';
  const cot = String(cotizacionNumero || '').trim();
  let t = `Hola, soy ${n}. Vengo del chat de Reiki`;
  if (cot) t += ` - cotización ${cot}`;
  return t;
}

/**
 * Mensaje de cierre + botón cta_url al ingeniero.
 * @param {{ to: string, nombre?: string, cotizacionNumero?: string, cfg?: object }} opts
 */
export async function sendEngineerHandoff(opts) {
  const { to, nombre, cotizacionNumero, cfg } = opts;
  const body = buildHandoffBody({ nombre, cotizacionNumero });
  const url = attentionWhatsAppUrl(engineerPrefill(nombre, cotizacionNumero));
  try {
    await sendCtaUrl({ to, body, displayText: CTA_LABEL, url, cfg });
  } catch (err) {
    console.warn('[whatsapp-atencion] cta_url falló, texto+link', err?.message || err);
    await sendText({ to, body: `${body}\n${url}`, cfg });
  }
  return body;
}

/**
 * Aviso único durante pausa humana (Redis + memoria).
 * @returns {Promise<boolean>} true si se envió ahora
 */
export async function sendPauseNoticeOnce(from, cfg) {
  const id = String(from || '').trim();
  if (!id) return false;

  if (pauseNoticeMem.has(id)) return false;

  const redis = getRedis();
  if (redis) {
    try {
      const existing = await redis.get(waKey('pause_notice', id));
      if (existing) {
        pauseNoticeMem.set(id, true);
        return false;
      }
      const hours = Number(process.env.HUMAN_MODE_HOURS) > 0 ? Number(process.env.HUMAN_MODE_HOURS) : 12;
      await redis.set(waKey('pause_notice', id), '1', { ex: hours * 3600 + 3600 });
    } catch (err) {
      console.warn('[whatsapp-atencion] pause_notice redis', err?.message || err);
    }
  }

  pauseNoticeMem.set(id, true);
  try {
    await sendCtaUrl({
      to: id,
      body: PAUSE_NOTICE_BODY,
      displayText: CTA_LABEL,
      url: ATTENTION_WHATSAPP_URL,
      cfg,
    });
  } catch (err) {
    console.warn('[whatsapp-atencion] pause cta falló', err?.message || err);
    try {
      await sendText({
        to: id,
        body: `${PAUSE_NOTICE_BODY}\n${ATTENTION_WHATSAPP_URL}`,
        cfg,
      });
    } catch (err2) {
      console.warn('[whatsapp-atencion] pause text falló', err2?.message || err2);
    }
  }
  return true;
}

export async function clearPauseNotice(from) {
  const id = String(from || '').trim();
  if (!id) return;
  pauseNoticeMem.delete(id);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(waKey('pause_notice', id));
    } catch {
      /* ignore */
    }
  }
}

/** Habeas data una vez por conversación (antes de pedir el nombre). */
export async function ensureHabeasDataSent(from, cfg) {
  const id = String(from || '').trim();
  if (!id) return false;
  if (habeasMem.has(id)) return false;

  const redis = getRedis();
  if (redis) {
    try {
      const existing = await redis.get(waKey('habeas', id));
      if (existing) {
        habeasMem.set(id, true);
        return false;
      }
      await redis.set(waKey('habeas', id), '1', { ex: 7 * 24 * 3600 });
    } catch (err) {
      console.warn('[whatsapp-atencion] habeas redis', err?.message || err);
    }
  }

  habeasMem.set(id, true);
  await sendText({ to: id, body: HABEAS_DATA_MSG, cfg });
  return true;
}

export async function clearHabeasFlag(from) {
  const id = String(from || '').trim();
  if (!id) return;
  habeasMem.delete(id);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(waKey('habeas', id));
    } catch {
      /* ignore */
    }
  }
}
