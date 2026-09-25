/**
 * Webhook WhatsApp Cloud API (Meta) — Vercel serverless.
 *
 * GET  /api/whatsapp-webhook  → verificación hub.challenge
 * POST /api/whatsapp-webhook  → mensajes entrantes
 *
 * Env:
 *   WHATSAPP_VERIFY_TOKEN
 *   WHATSAPP_ACCESS_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 *   WHATSAPP_APP_SECRET          (opcional pero recomendado: valida X-Hub-Signature-256)
 *   PERSONAL_PHONE_NUMBER        (celular personal para leads; fallback WHATSAPP_OWNER_PHONE)
 *   WHATSAPP_OWNER_PHONE         (alias / fallback del personal)
 *   CALLMEBOT_API_KEY            (aviso gratis al dueño cuando hay lead)
 *   WHATSAPP_SITE_URL            (default https://reikisolar.com.co)
 *   OPENAI_API_KEY               (opcional: conversación natural + tools)
 *   OPENAI_MODEL                 (default gpt-4o-mini)
 */
import crypto from 'node:crypto';
import { getWhatsAppConfig, isWhatsAppConfigured, sendText } from './_lib/whatsapp.js';
import { extractInboundMessages, handleIncomingMessage } from './_lib/whatsapp-bot.js';

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === 'string') {
      resolve(req.body);
      return;
    }
    if (Buffer.isBuffer(req.body)) {
      resolve(req.body.toString('utf8'));
      return;
    }
    if (req.body && typeof req.body === 'object') {
      resolve(JSON.stringify(req.body));
      return;
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseQuery(req) {
  const host = req.headers?.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);
  return url.searchParams;
}

function verifySignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) return { ok: true, skipped: true };
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return { ok: false, reason: 'missing_header' };
  }
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const received = signatureHeader.slice('sha256='.length);
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
    return { ok, reason: ok ? 'match' : 'mismatch' };
  } catch {
    return { ok: false, reason: 'compare_error' };
  }
}

/** Resumen seguro para logs */
function summarizeWebhook(body) {
  const summary = [];
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const msgs = value.messages || [];
      const statuses = value.statuses || [];
      summary.push({
        field: change.field,
        phoneNumberId: value.metadata?.phone_number_id,
        displayPhone: value.metadata?.display_phone_number,
        messages: msgs.map((m) => ({
          type: m.type,
          from: m.from,
          from_user_id: m.from_user_id || null,
          id: m.id,
          hasText: Boolean(m.text?.body),
          errors: m.errors || null,
        })),
        statuses: statuses.map((s) => ({
          status: s.status,
          recipient: s.recipient_id,
          recipient_user_id: s.recipient_user_id || null,
          errors: s.errors || null,
        })),
        contacts: (value.contacts || []).map((c) => ({
          wa_id: c.wa_id || null,
          user_id: c.user_id || c.bsuid || null,
        })),
        errors: value.errors || null,
      });
    }
  }
  return summary;
}

export default async function handler(req, res) {
  const cfg = getWhatsAppConfig();

  if (req.method === 'GET') {
    const q = parseQuery(req);
    const mode = q.get('hub.mode');
    const token = q.get('hub.verify_token');
    const challenge = q.get('hub.challenge');

    if (mode === 'subscribe' && token && cfg.verifyToken && token === cfg.verifyToken) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.end(challenge || '');
    }

    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Verificación fallida. Revisa WHATSAPP_VERIFY_TOKEN.' }));
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Solo GET (verify) o POST (mensajes).' }));
  }

  try {
    let body = {};
    let raw = '';
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      body = req.body;
      raw = JSON.stringify(req.body);
    } else {
      raw = await readRawBody(req);
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }

    const signature = req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256'];
    const sig = verifySignature(raw, signature, cfg.appSecret);
    if (!sig.ok) {
      console.warn('[whatsapp-webhook] Firma no válida:', sig.reason, '- se procesa igual. Revisa WHATSAPP_APP_SECRET.');
    }

    if (!isWhatsAppConfigured(cfg)) {
      console.warn('[whatsapp-webhook] Credenciales incompletas', {
        hasToken: Boolean(cfg.token),
        hasPhoneId: Boolean(cfg.phoneNumberId),
        hasVerify: Boolean(cfg.verifyToken),
      });
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, skipped: 'not_configured' }));
    }

    const diag = summarizeWebhook(body);
    const messages = extractInboundMessages(body);

    console.log(
      '[whatsapp-webhook] diag:',
      JSON.stringify({
        bodyKeys: Object.keys(body || {}),
        parsed: diag,
        extracted: messages.map((m) => ({
          from: m.from,
          type: m.rawType,
          text: String(m.text || '').slice(0, 40),
          id: m.buttonId || m.listId || '',
        })),
      })
    );

    for (const block of diag) {
      for (const st of block.statuses || []) {
        if (st.status === 'failed' || st.errors?.length) {
          console.error('[whatsapp-webhook] entrega fallida a', st.recipient, st.errors || st.status);
        }
      }
    }

    for (const msg of messages) {
      try {
        await handleIncomingMessage(msg);
      } catch (err) {
        console.error('[whatsapp-webhook] Error manejando mensaje', err?.message || err, err?.data || '');
        try {
          await sendText({
            to: msg.from,
            body: '¡Hola! ☀️ Te saluda Reiki Energía Solar. Escribe *hola* para ver el menú.',
            cfg,
          });
        } catch (err2) {
          console.error('[whatsapp-webhook] fallback sendText también falló', err2?.message || err2);
        }
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: true, received: messages.length }));
  } catch (err) {
    console.error('[whatsapp-webhook]', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: err.message || 'Error webhook' }));
    }
  }
}
