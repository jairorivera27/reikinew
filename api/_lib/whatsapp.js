/**
 * Cliente mínimo WhatsApp Cloud API (Meta).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 * Soporta teléfono (`to`) y BSUID (`recipient` / from_user_id) — necesario para iOS con username/privacidad.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export function getWhatsAppConfig() {
  const personalPhone = String(
    process.env.PERSONAL_PHONE_NUMBER || process.env.WHATSAPP_OWNER_PHONE || '573245737413'
  ).replace(/\D/g, '');
  return {
    token: String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
    phoneNumberId: String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    verifyToken: String(process.env.WHATSAPP_VERIFY_TOKEN || '').trim(),
    appSecret: String(process.env.WHATSAPP_APP_SECRET || '').trim(),
    ownerPhone: personalPhone,
    personalPhone,
    callmebotKey: String(process.env.CALLMEBOT_API_KEY || '').trim(),
    siteUrl: String(process.env.WHATSAPP_SITE_URL || process.env.ADDI_SITE_URL || 'https://reikisolar.com.co').replace(
      /\/$/,
      ''
    ),
  };
}

export function isWhatsAppConfigured(cfg = getWhatsAppConfig()) {
  return Boolean(cfg.token && cfg.phoneNumberId && cfg.verifyToken);
}

/** True si el id parece BSUID (ej. CO.1629790025323775) */
export function isBsuid(id) {
  return /^[A-Z]{2}(\.ENT)?\.[A-Za-z0-9]+$/.test(String(id || '').trim());
}

/**
 * Normaliza celular colombiano a dígitos internacionales (57…).
 * Acepta 300…, 57 300…, +57…
 */
export function parsePhoneCo(text) {
  const digits = String(text || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 && /^3\d{9}$/.test(digits)) return `57${digits}`;
  if (digits.length === 12 && digits.startsWith('57') && /^573\d{9}$/.test(digits)) return digits;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return '';
}

/**
 * Formato display Colombia: "+57 324 573 7413" (no "+573245737413").
 */
export { formatPhoneCO } from './phone.js';
import { formatPhoneCO } from './phone.js';

/**
 * Línea de contacto para leads CallMeBot / Cloud API.
 * Con username/privacidad Meta no manda teléfono: solo BSUID.
 */
export function formatClientContact(from, data = {}) {
  const tel = parsePhoneCo(data?.telefono || data?.celular || '');
  if (tel) return `WhatsApp / celular: ${formatPhoneCO(tel)}`;
  if (isBsuid(from)) {
    return (
      `WhatsApp: número oculto (username/privacidad)\n` +
      `ID interno: ${from}\n` +
      `→ Responde en WhatsApp Business / Meta (mismo chat del cliente)`
    );
  }
  const digits = String(from || '').replace(/\D/g, '');
  if (digits) return `WhatsApp: ${formatPhoneCO(digits)}`;
  return `WhatsApp: ${from || '—'}`;
}

/**
 * Arma destino: teléfono → `to`; BSUID → `recipient`.
 * @param {string} toOrRecipient
 */
export function recipientFields(toOrRecipient) {
  const raw = String(toOrRecipient || '').trim();
  if (!raw) return {};
  if (isBsuid(raw)) {
    return { recipient: raw, recipient_type: 'individual' };
  }
  const digits = raw.replace(/\D/g, '');
  if (digits) return { to: digits, recipient_type: 'individual' };
  // Fallback: enviar como recipient tal cual
  return { recipient: raw, recipient_type: 'individual' };
}

async function graphPost(phoneNumberId, token, payload) {
  const url = `${GRAPH}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `WhatsApp API ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Texto simple */
export async function sendText({ to, body, cfg = getWhatsAppConfig() }) {
  return graphPost(cfg.phoneNumberId, cfg.token, {
    messaging_product: 'whatsapp',
    ...recipientFields(to),
    type: 'text',
    text: { preview_url: true, body },
  });
}

/** Botones de respuesta (máx. 3) */
export async function sendButtons({ to, body, buttons, cfg = getWhatsAppConfig() }) {
  return graphPost(cfg.phoneNumberId, cfg.token, {
    messaging_product: 'whatsapp',
    ...recipientFields(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: String(b.title).slice(0, 20) },
        })),
      },
    },
  });
}

/** Lista interactiva */
export async function sendList({ to, body, buttonText, sections, cfg = getWhatsAppConfig() }) {
  return graphPost(cfg.phoneNumberId, cfg.token, {
    messaging_product: 'whatsapp',
    ...recipientFields(to),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: {
        button: String(buttonText || 'Ver opciones').slice(0, 20),
        sections,
      },
    },
  });
}

/**
 * Botón de llamada a la acción (URL). display_text máx. 20 caracteres.
 * @param {{ to: string, body: string, displayText: string, url: string, cfg?: object }} opts
 */
export async function sendCtaUrl({ to, body, displayText, url, cfg = getWhatsAppConfig() }) {
  return graphPost(cfg.phoneNumberId, cfg.token, {
    messaging_product: 'whatsapp',
    ...recipientFields(to),
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: String(body || '').slice(0, 1024) },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: String(displayText || 'Abrir').slice(0, 20),
          url: String(url || '').trim(),
        },
      },
    },
  });
}

/** Imagen por URL pública https */
export async function sendImage({ to, link, caption, cfg = getWhatsAppConfig() }) {
  return graphPost(cfg.phoneNumberId, cfg.token, {
    messaging_product: 'whatsapp',
    ...recipientFields(to),
    type: 'image',
    image: {
      link: String(link || '').trim(),
      ...(caption ? { caption: String(caption).slice(0, 1024) } : {}),
    },
  });
}

/**
 * Sube un PDF a la API de medios de WhatsApp Cloud.
 * @param {Buffer|Uint8Array} pdfBuffer
 * @param {string} filename
 * @param {object} [cfg]
 * @returns {Promise<string>} media id
 */
export async function uploadWhatsAppMedia(pdfBuffer, filename = 'cotizacion.pdf', cfg = getWhatsAppConfig()) {
  const FormData = globalThis.FormData;
  const Blob = globalThis.Blob;
  if (!FormData || !Blob) throw new Error('FormData/Blob no disponibles en este runtime');
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'application/pdf');
  form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);

  const url = `${GRAPH}/${cfg.phoneNumberId}/media`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    const msg = data?.error?.message || `WhatsApp media upload ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return String(data.id);
}

/**
 * Documento PDF por media id (preferido) o link https público.
 * @param {{ to: string, mediaId?: string, link?: string, filename?: string, caption?: string, cfg?: object }} opts
 */
export async function sendDocument({ to, mediaId, link, filename, caption, cfg = getWhatsAppConfig() }) {
  const doc = {
    filename: String(filename || 'documento.pdf').slice(0, 240),
    ...(caption ? { caption: String(caption).slice(0, 1024) } : {}),
  };
  if (mediaId) doc.id = String(mediaId);
  else if (link) doc.link = String(link).trim();
  else throw new Error('sendDocument requiere mediaId o link');

  return graphPost(cfg.phoneNumberId, cfg.token, {
    messaging_product: 'whatsapp',
    ...recipientFields(to),
    type: 'document',
    document: doc,
  });
}

/**
 * Aviso al número personal (PERSONAL_PHONE_NUMBER):
 * 1) WhatsApp Cloud API (si la ventana de 24h lo permite)
 * 2) CallMeBot (gratis, fiable)
 */
export async function notifyOwner(message, cfg = getWhatsAppConfig()) {
  const plain = String(message || '')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1500);

  const to = cfg.personalPhone || cfg.ownerPhone;
  console.log('[whatsapp] LEAD PARA ASESOR →', to, '\n', plain);

  const results = [];

  if (cfg.token && cfg.phoneNumberId && to) {
    try {
      await sendText({ to, body: plain, cfg });
      console.log('[whatsapp] Lead enviado por Cloud API a', to);
      results.push({ ok: true, method: 'cloud_api' });
    } catch (err) {
      console.warn('[whatsapp] Cloud API al personal falló (normal si no hay ventana 24h):', err?.message || err);
      results.push({ ok: false, method: 'cloud_api', error: String(err?.message || err) });
    }
  }

  if (cfg.callmebotKey && to) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${to}&text=${encodeURIComponent(plain)}&apikey=${encodeURIComponent(cfg.callmebotKey)}`;
    try {
      const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'ReikiWhatsAppBot/1.0' } });
      const text = await res.text();
      const ok = res.ok || /queued|Message to/i.test(text);
      const paused = /Paused|resume/i.test(text);
      console.log('[whatsapp] CallMeBot', { status: res.status, ok, paused, detail: text.slice(0, 200) });
      if (paused) {
        console.error('[whatsapp] CallMeBot PAUSADO — el dueño debe enviar "resume" al bot de CallMeBot');
      }
      results.push({ ok: ok && !paused, method: 'callmebot', detail: text.slice(0, 200), paused });
      if (ok && !paused) return { ok: true, method: 'callmebot', results };
    } catch (err) {
      console.error('[whatsapp] CallMeBot error', err);
      results.push({ ok: false, method: 'callmebot', error: String(err?.message || err) });
    }
  }

  if (results.some((r) => r.ok)) return { ok: true, results };
  console.warn('[whatsapp] PERSONAL_PHONE_NUMBER/CALLMEBOT faltan o fallaron — lead solo en logs');
  return { ok: Boolean(results.length), method: 'log', results };
}

/**
 * POST JSON a LEADS_WEBHOOK_URL (p. ej. Google Apps Script → Sheets).
 * No bloquea el flujo si falla.
 * @param {Record<string, unknown>} payload
 */
export async function postLeadWebhook(payload) {
  const url = String(process.env.LEADS_WEBHOOK_URL || '').trim();
  if (!url) return { ok: false, skipped: true };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        fecha_bogota: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        source: payload?.source || 'whatsapp',
      }),
    });
    const ok = res.ok;
    if (!ok) console.warn('[whatsapp] LEADS_WEBHOOK_URL status', res.status);
    return { ok, status: res.status };
  } catch (err) {
    console.warn('[whatsapp] LEADS_WEBHOOK_URL error', err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}
