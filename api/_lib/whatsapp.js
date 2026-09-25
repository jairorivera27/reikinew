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
