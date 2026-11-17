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
    ownerAlertTemplate: String(process.env.OWNER_ALERT_TEMPLATE || '').trim(),
    ownerAlertLang: String(process.env.OWNER_ALERT_LANG || 'es').trim() || 'es',
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
 * 1) Plantilla utility OWNER_ALERT_TEMPLATE (si está configurada; salta ventana 24h)
 * 2) WhatsApp Cloud API texto libre (si hay ventana 24h)
 * 3) CallMeBot (gratis, fiable)
 *
 * Plantilla sugerida (WhatsApp Manager → Plantillas de mensajes → Utility):
 *   Nombre: reiki_owner_alert  (o el valor de OWNER_ALERT_TEMPLATE)
 *   Idioma: Spanish (es)
 *   Encabezado: DOCUMENTO (opcional; para PDF)
 *   Cuerpo:
 *     Alerta Reiki: {{1}}
 *     Cliente: {{2}}
 *     Ciudad: {{3}}
 *     Detalle: {{4}}
 *   Botón URL opcional: Ver cotización → {{1}} = link
 *
 * Variables al llamar notifyOwner(msg, cfg, { templateVars, documentLink, documentFilename })
 */
export async function notifyOwner(message, cfg = getWhatsAppConfig(), opts = {}) {
  const plain = String(message || '')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1500);

  const to = cfg.personalPhone || cfg.ownerPhone;
  console.log('[whatsapp] LEAD PARA ASESOR →', to, '\n', plain);

  const results = [];

  // 1) Plantilla utility (fuera de ventana 24h)
  if (cfg.token && cfg.phoneNumberId && to && cfg.ownerAlertTemplate) {
    try {
      const vars = opts.templateVars || [
        String(opts.titulo || 'Nuevo aviso').slice(0, 60),
        String(opts.nombre || 'Cliente').slice(0, 60),
        String(opts.ciudad || '—').slice(0, 60),
        plain.slice(0, 500),
      ];
      const components = [
        {
          type: 'body',
          parameters: vars.map((text) => ({
            type: 'text',
            // Meta rechaza parámetros con saltos de línea, tabs o 4+ espacios seguidos
            text:
              String(text || '—')
                .replace(/[\r\n\t]+/g, ' | ')
                .replace(/ {4,}/g, '   ')
                .trim()
                .slice(0, 1024) || '—',
          })),
        },
      ];
      if (opts.documentLink) {
        components.unshift({
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                link: opts.documentLink,
                filename: opts.documentFilename || 'Cotizacion-Reiki.pdf',
              },
            },
          ],
        });
      }
      await graphPost(cfg.phoneNumberId, cfg.token, {
        messaging_product: 'whatsapp',
        ...recipientFields(to),
        type: 'template',
        template: {
          name: cfg.ownerAlertTemplate,
          language: { code: cfg.ownerAlertLang || 'es' },
          components,
        },
      });
      console.log('[whatsapp] Lead por plantilla', cfg.ownerAlertTemplate);
      results.push({ ok: true, method: 'template' });
      return { ok: true, method: 'template', results };
    } catch (err) {
      console.warn('[whatsapp] Plantilla OWNER_ALERT falló:', err?.message || err);
      results.push({ ok: false, method: 'template', error: String(err?.message || err) });
    }
  }

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
      const paused = /Paused|resume/i.test(text);
      const quotaGone =
        /0\s*messages?\s*left/i.test(text) ||
        /Message not sent/i.test(text) ||
        /subscribe .* to continue using CallMeBot/i.test(text);
      // CallMeBot a veces responde 200 con "Message to: …" aunque NO envió (cupo agotado).
      const ok =
        !paused &&
        !quotaGone &&
        (/queued/i.test(text) || (/Message to/i.test(text) && !/not sent/i.test(text)));
      console.log('[whatsapp] CallMeBot', {
        status: res.status,
        ok,
        paused,
        quotaGone,
        detail: text.replace(/<[^>]+>/g, ' ').slice(0, 220),
      });
      if (paused) {
        console.error('[whatsapp] CallMeBot PAUSADO — el dueño debe enviar "resume" al bot de CallMeBot');
      }
      if (quotaGone) {
        console.error(
          '[whatsapp] CallMeBot SIN CUPO — suscribirse en https://callmebot.com/' +
            to +
            ' (Message not sent / 0 messages left)'
        );
      }
      results.push({
        ok,
        method: 'callmebot',
        detail: text.replace(/<[^>]+>/g, ' ').slice(0, 220),
        paused,
        quotaGone,
      });
      if (ok) return { ok: true, method: 'callmebot', results };
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

/**
 * Plantilla aprobada por Meta (necesaria para escribirle al cliente fuera de la ventana de 24 h).
 * params: textos del cuerpo en orden ({{1}}, {{2}}, …).
 */
export async function sendTemplate({ to, name, lang = 'es', params = [], cfg = getWhatsAppConfig() }) {
  return graphPost(cfg.phoneNumberId, cfg.token, {
    messaging_product: 'whatsapp',
    ...recipientFields(to),
    type: 'template',
    template: {
      name,
      language: { code: lang },
      components: [{ type: 'body', parameters: params.map((t) => ({ type: 'text', text: String(t || '—').replace(/[\n\t]+/g, ' ').replace(/ {4,}/g, '   ').slice(0, 900) })) }],
    },
  });
}

/**
 * Bot de notificaciones de envío (solo informa; el mensaje pide no responder).
 * Aviso de envío al cliente por WhatsApp: primero con la plantilla de estado de envío (WHATSAPP_TPL_ENVIO,
 * por defecto "estado_envio": {{1}} nombre, {{2}} pedido, {{3}} novedad, {{4}} guía); si la plantilla no existe
 * o falla, intenta un texto normal (solo llega si el cliente escribió en las últimas 24 h).
 */
export async function avisoEnvioWhatsApp({ celular, nombre, pedido, novedad, guia, cfg = getWhatsAppConfig() }) {
  if (!isWhatsAppConfigured(cfg)) return { ok: false, motivo: 'WhatsApp no configurado' };
  let to = String(celular || '').replace(/\D/g, '');
  if (to.length === 10 && to.startsWith('3')) to = '57' + to;
  if (!/^573\d{9}$/.test(to)) return { ok: false, motivo: 'celular inválido' };
  const tpl = String(process.env.WHATSAPP_TPL_ENVIO || 'estado_envio').trim();
  const lang = String(process.env.WHATSAPP_TPL_ENVIO_LANG || 'es').trim();
  try {
    await sendTemplate({ to, name: tpl, lang, params: [nombre, pedido, novedad, guia], cfg });
    return { ok: true, metodo: 'plantilla' };
  } catch (err) {
    const e1 = String(err?.message || err);
    try {
      await sendText({ to, body: `🤖 *Esto es un robot de notificaciones, por favor no responder este mensaje.*\n\nHola ${nombre}, te escribimos de Reiki Energía Solar con novedades de tu pedido ${pedido}: ${novedad}\n\nGuía: ${guia}\nRastrea aquí: https://envia.com/rastreo?label=${String(guia).split(',')[0].trim()}&cntry_code=co`, cfg });
      return { ok: true, metodo: 'texto', nota: e1.slice(0, 120) };
    } catch (err2) {
      return { ok: false, motivo: `plantilla: ${e1.slice(0, 120)} · texto: ${String(err2?.message || err2).slice(0, 120)}` };
    }
  }
}

/* ---------- Plantillas (crear desde la API, sin entrar a WhatsApp Manager) ---------- */
async function graphGet(path, token) {
  const res = await fetch(`${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Graph ${res.status}`);
  return data;
}

/** Cuentas de WhatsApp Business (WABA) a las que tiene acceso el token del bot. */
export async function cuentasWhatsApp(cfg = getWhatsAppConfig()) {
  const d = await graphGet(`debug_token?input_token=${encodeURIComponent(cfg.token)}`, cfg.token);
  const ids = new Set();
  for (const s of d?.data?.granular_scopes || []) if (/whatsapp_business/.test(s.scope)) (s.target_ids || []).forEach((x) => ids.add(x));
  try {
    const { getRedis, waKey } = await import('./whatsapp-redis.js');
    const r = getRedis();
    const w = r ? await r.get(waKey('meta', 'waba')) : null;
    if (w) ids.add(String(w));
  } catch {}
  if (process.env.WHATSAPP_WABA_ID) ids.add(String(process.env.WHATSAPP_WABA_ID).trim());
  if (!ids.size) {
    // Token de usuario del sistema: buscar por las empresas del token
    try {
      const me = await graphGet('me?fields=id,name,businesses{id,name}', cfg.token);
      const bizs = me?.businesses?.data || [];
      if (!bizs.length && me?.id) {
        try {
          const b = await graphGet(`${me.id}/assigned_business_asset_groups`, cfg.token);
          void b;
        } catch {}
      }
      for (const b of bizs) {
        for (const ed of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
          try {
            const r = await graphGet(`${b.id}/${ed}?fields=id,name`, cfg.token);
            (r.data || []).forEach((w) => ids.add(w.id));
          } catch {}
        }
      }
      if (!ids.size) return { cuentas: [], scopes: d?.data?.scopes || [], me };
    } catch (err) {
      return { cuentas: [], scopes: d?.data?.scopes || [], error: String(err?.message || err), tipo: d?.data?.type };
    }
  }
  const out = [];
  for (const id of ids) {
    try {
      const w = await graphGet(`${id}?fields=id,name`, cfg.token);
      const nums = await graphGet(`${id}/phone_numbers?fields=id,display_phone_number,verified_name`, cfg.token);
      out.push({ id: w.id, nombre: w.name, numeros: nums.data || [] });
    } catch (err) {
      out.push({ id, error: String(err?.message || err) });
    }
  }
  return { cuentas: out, scopes: (d?.data?.scopes || []) };
}

/** Plantillas de una WABA. */
export async function plantillas(wabaId, cfg = getWhatsAppConfig()) {
  const d = await graphGet(`${wabaId}/message_templates?fields=name,status,language,category,rejected_reason&limit=100`, cfg.token);
  return d.data || [];
}

/** Crea la plantilla de notificaciones de envío (estado_envio). */
export async function crearPlantillaEnvio(wabaId, { nombre = 'estado_envio', idioma = 'es' } = {}, cfg = getWhatsAppConfig()) {
  const res = await fetch(`${GRAPH}/${wabaId}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: nombre,
      language: idioma,
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text: '🤖 Esto es un robot de notificaciones, por favor no responder este mensaje.\n\nHola {{1}}, te escribimos de Reiki Energía Solar con novedades de tu pedido {{2}}: {{3}}\n\nGuía: {{4}}\nPuedes rastrear tu envío en envia.com/rastreo',
          example: { body_text: [['Néstor', 'Cot -091126004 R5', 'la transportadora ya recogió tu pedido y va en camino.', '2301381941']] },
        },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.error_user_msg || data?.error?.message || `Graph ${res.status}`);
  return data;
}

/** Consulta GET de solo lectura al Graph con el token del bot (diagnóstico desde el panel; solo Claude). */
export async function graphDiagnostico(path, cfg = getWhatsAppConfig()) {
  if (!/^[A-Za-z0-9_\/?=&,{}.\-]+$/.test(path)) throw new Error('ruta inválida');
  return graphGet(path.replace('{PHONE_ID}', cfg.phoneNumberId), cfg.token);
}
