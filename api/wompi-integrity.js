/**
 * Vercel Serverless Function: firma SHA-256 requerida por Wompi (signature:integrity).
 * Secreto solo en variables de entorno del proyecto (nunca en el cliente).
 * @see https://docs.wompi.co/en/docs/colombia/widget-checkout-web/
 */
import crypto from 'node:crypto';

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo se admite POST.' }));
  }
  const secret = String(process.env.WOMPI_INTEGRITY_SECRET || '').trim();
  if (!secret) {
    res.statusCode = 500;
    return res.end(
      JSON.stringify({
        ok: false,
        error: 'WOMPI_INTEGRITY_SECRET no está configurado en el servidor (Vercel → Settings → Environment Variables).',
      })
    );
  }
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw || '{}');
    const reference = body.reference;
    const amountInCents = body.amountInCents;
    const currency = body.currency != null ? String(body.currency) : 'COP';
    if (reference == null || reference === '' || amountInCents == null || Number.isNaN(Number(amountInCents))) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'reference y amountInCents son obligatorios.' }));
    }
    const concat = String(reference) + String(amountInCents) + currency + secret;
    const integrity = crypto.createHash('sha256').update(concat, 'utf8').digest('hex');
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, integrity }));
  } catch (_e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'No se pudo generar la firma de integridad.' }));
  }
}
