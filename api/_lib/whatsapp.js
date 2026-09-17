/**
 * Cliente mínimo WhatsApp Cloud API (Meta).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export function getWhatsAppConfig() {
  return {
    token: String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
    phoneNumberId: String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    verifyToken: String(process.env.WHATSAPP_VERIFY_TOKEN || '').trim(),
    appSecret: String(process.env.WHATSAPP_APP_SECRET || '').trim(),
    ownerPhone: String(process.env.WHATSAPP_OWNER_PHONE || '573004052638').replace(/\D/g, ''),
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
    to: String(to).replace(/\D/g, ''),
    type: 'text',
    text: { preview_url: true, body },
  });
}

/** Botones de respuesta (máx. 3) */
export async function sendButtons({ to, body, buttons, cfg = getWhatsAppConfig() }) {
  return graphPost(cfg.phoneNumberId, cfg.token, {
    messaging_product: 'whatsapp',
    to: String(to).replace(/\D/g, ''),
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
    to: String(to).replace(/\D/g, ''),
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

/** Aviso al dueño vía CallMeBot (gratis) o log */
export async function notifyOwner(message, cfg = getWhatsAppConfig()) {
  if (cfg.callmebotKey && cfg.ownerPhone) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${cfg.ownerPhone}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(cfg.callmebotKey)}`;
    try {
      const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'ReikiWhatsAppBot/1.0' } });
      const text = await res.text();
      return { ok: res.ok, method: 'callmebot', detail: text.slice(0, 120) };
    } catch (err) {
      console.error('[whatsapp] CallMeBot error', err);
    }
  }
  console.log('[whatsapp] LEAD PARA ASESOR\n', message);
  return { ok: true, method: 'log' };
}
