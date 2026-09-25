/**
 * Confirmación segura de pagos Wompi → cotización pagada_online.
 * Nunca confiar en el cliente del navegador: siempre GET /v1/transactions/{id} con llave privada.
 */
import crypto from 'node:crypto';
import {
  getCotizacion,
  getCotizacionIdByPaymentRef,
  updateCotizacionEstado,
} from './cotizacion-store.js';
import { getRedis, waKey } from './whatsapp-redis.js';
import { notifyOwner, getWhatsAppConfig } from './whatsapp.js';

function resolveProp(data, path) {
  const parts = String(path || '').split('.');
  let cur = data;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Valida firma de evento Wompi (SHA256).
 * @see https://docs.wompi.co/docs/colombia/eventos/
 */
export function verifyWompiEventSignature(body, headerChecksum, secret) {
  const sec = String(secret || '').trim();
  if (!sec) return { ok: false, reason: 'missing_secret' };
  if (!body || typeof body !== 'object') return { ok: false, reason: 'no_body' };

  const props = body.signature?.properties;
  const checksum = String(
    headerChecksum || body.signature?.checksum || ''
  )
    .trim()
    .toLowerCase();
  if (!Array.isArray(props) || !props.length || !checksum) {
    return { ok: false, reason: 'no_signature' };
  }

  let concat = '';
  for (const path of props) {
    const v = resolveProp(body.data, path);
    if (v === undefined || v === null) concat += '';
    else concat += String(v);
  }
  concat += String(body.timestamp ?? '');
  concat += sec;

  const computed = crypto.createHash('sha256').update(concat, 'utf8').digest('hex').toLowerCase();
  const a = Buffer.from(computed);
  const b = Buffer.from(checksum);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'mismatch', computed };
  }
  return { ok: true };
}

export async function fetchWompiTransaction(transactionId, { sandbox = false } = {}) {
  const id = String(transactionId || '').trim();
  if (!id) return null;
  const prv = String(process.env.WOMPI_PRIVATE_KEY || '').trim();
  if (!prv) throw new Error('WOMPI_PRIVATE_KEY no configurada');
  const host = sandbox ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';
  const res = await fetch(`${host}/v1/transactions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${prv}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.reason || `Wompi ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json?.data || json;
}

function amountMatchesCot(txAmountCents, cotTotalCop) {
  const cents = Number(txAmountCents);
  const expected = Math.round(Number(cotTotalCop) || 0) * 100;
  if (!Number.isFinite(cents) || !Number.isFinite(expected) || expected <= 0) return false;
  return cents === expected;
}

/**
 * Marca pagada_online de forma idempotente y avisa al dueño una sola vez.
 * @returns {{ ok: boolean, already?: boolean, notified?: boolean, doc?: object, reason?: string }}
 */
export async function markCotizacionPagadaIdempotent(cotId, meta = {}) {
  const id = String(cotId || '').trim();
  if (!id) return { ok: false, reason: 'no_id' };

  const prev = await getCotizacion(id);
  if (!prev) return { ok: false, reason: 'not_found' };

  if (prev.estado === 'pagada_online' && prev.ownerNotifiedPagada) {
    return { ok: true, already: true, notified: false, doc: prev };
  }

  // Lock Redis corto para evitar doble aviso por race
  const redis = getRedis();
  const lockKey = waKey('cotpaidlock', id);
  if (redis) {
    try {
      const got = await redis.set(lockKey, '1', { nx: true, ex: 30 });
      if (got === null || got === false) {
        const again = await getCotizacion(id);
        if (again?.estado === 'pagada_online' && again?.ownerNotifiedPagada) {
          return { ok: true, already: true, notified: false, doc: again };
        }
      }
    } catch {
      /* continue */
    }
  }

  const fresh = await getCotizacion(id);
  if (fresh?.estado === 'pagada_online' && fresh?.ownerNotifiedPagada) {
    return { ok: true, already: true, notified: false, doc: fresh };
  }

  const doc = await updateCotizacionEstado(id, 'pagada_online', {
    pagadaAt: fresh?.pagadaAt || new Date().toISOString(),
    paymentReference: meta.reference || fresh?.paymentReference || null,
    wompiTransactionId: meta.transactionId || fresh?.wompiTransactionId || null,
    amountInCents: meta.amountInCents ?? fresh?.amountInCents ?? null,
  });

  let notified = false;
  if (!doc?.ownerNotifiedPagada) {
    const cfg = getWhatsAppConfig();
    await notifyOwner(
      `✅ Cotización pagada online (Wompi)\n` +
        `N.º: ${doc?.numero || id}\n` +
        `Excluido IVA: ${doc?.subtotal_excluido != null ? '$ ' + Number(doc.subtotal_excluido).toLocaleString('es-CO') : '—'}\n` +
        `Base gravada: ${doc?.subtotal_base != null ? '$ ' + Number(doc.subtotal_base).toLocaleString('es-CO') : '—'}\n` +
        `IVA 19%: ${doc?.iva != null ? '$ ' + Number(doc.iva).toLocaleString('es-CO') : '—'}\n` +
        `Total: ${doc?.totalFmt || '—'}\n` +
        `Cliente: ${doc?.cliente?.nombre || '—'}\n` +
        `Celular: ${doc?.cliente?.celular || '—'}\n` +
        `Ref: ${meta.reference || '—'}\n` +
        `Tx: ${meta.transactionId || '—'}`,
      cfg
    );
    await updateCotizacionEstado(id, 'pagada_online', { ownerNotifiedPagada: true });
    notified = true;
  }

  return { ok: true, already: false, notified, doc: await getCotizacion(id) };
}

/**
 * Confirma pago desde una transacción Wompi ya obtenida (o por id).
 * Exige APPROVED, referencia cot-{id}-… (o índice), monto = total cotización.
 */
export async function confirmPagoFromWompiTransaction(tx, opts = {}) {
  if (!tx || typeof tx !== 'object') return { ok: false, reason: 'no_tx' };

  const status = String(tx.status || '').toUpperCase();
  if (status !== 'APPROVED') {
    return { ok: false, reason: 'not_approved', status };
  }

  const reference = String(tx.reference || opts.reference || '').trim();
  const amountInCents = Number(tx.amount_in_cents ?? tx.amountInCents);
  const transactionId = String(tx.id || opts.transactionId || '').trim();

  let cotId = await getCotizacionIdByPaymentRef(reference);
  if (!cotId) {
    const m = reference.match(/^cot-([a-f0-9]+)-/i);
    if (m) cotId = m[1];
  }
  if (!cotId) return { ok: false, reason: 'no_cotizacion', reference };

  const cot = await getCotizacion(cotId);
  if (!cot) return { ok: false, reason: 'cot_missing', cotId };

  if (!amountMatchesCot(amountInCents, cot.total)) {
    console.warn('[wompi-confirm] monto no coincide', {
      amountInCents,
      expected: Math.round(cot.total) * 100,
      cotId,
    });
    return {
      ok: false,
      reason: 'amount_mismatch',
      amountInCents,
      expectedCents: Math.round(Number(cot.total) || 0) * 100,
    };
  }

  return markCotizacionPagadaIdempotent(cotId, {
    reference,
    transactionId,
    amountInCents,
  });
}

export async function confirmPagoByTransactionId(transactionId, { sandbox = false } = {}) {
  const tx = await fetchWompiTransaction(transactionId, { sandbox });
  return confirmPagoFromWompiTransaction(tx, { transactionId });
}
