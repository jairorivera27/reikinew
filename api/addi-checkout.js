/**
 * Vercel Serverless: crea una solicitud de crédito Addi y devuelve URL de redirección.
 *
 * POST /api/addi-checkout
 * Body: { orderId, totalAmount, items[], client{}, shippingAddress? }
 *
 * Env:
 *   ADDI_CLIENT_ID, ADDI_CLIENT_SECRET
 *   ADDI_ENV=sandbox|production
 *   ADDI_SITE_URL (opcional, default https://reikisolar.com.co)
 *
 * Docs: https://api-docs-sandbox.addi.com/
 */
import {
  getAddiConfig,
  getAddiAccessToken,
  readJsonBody,
  removeAccents,
} from './_lib/addi.js';

function cleanPhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length > 10) digits = digits.slice(2);
  return digits.slice(0, 10);
}

function cleanDoc(doc) {
  return String(doc || '').replace(/\D/g, '').slice(0, 20);
}

function splitName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = parts[0] || 'Cliente';
  const lastName = parts.slice(1).join(' ') || 'Reiki';
  return { firstName, lastName };
}

function toAddress(input) {
  let city = removeAccents(String(input?.city || 'Bogota')).trim() || 'Bogota';
  if (/bogot/i.test(city)) city = 'Bogota D.C';
  return {
    lineOne: removeAccents(String(input?.lineOne || input?.address || 'Direccion')).substring(0, 60),
    city,
    country: 'CO',
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo se admite POST.' }));
  }

  try {
    const cfg = getAddiConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      res.statusCode = 503;
      return res.end(
        JSON.stringify({
          ok: false,
          error:
            'Addi no está configurado. Define ADDI_CLIENT_ID y ADDI_CLIENT_SECRET (sandbox o prod) en Vercel / .env.',
          code: 'ADDI_NOT_CONFIGURED',
        })
      );
    }

    const body = await readJsonBody(req);
    const orderId = String(body.orderId || '').trim();
    const totalAmount = Number(body.totalAmount);
    const items = Array.isArray(body.items) ? body.items : [];
    const clientIn = body.client || {};

    if (!orderId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'orderId es obligatorio.' }));
    }
    if (!Number.isFinite(totalAmount) || totalAmount < 1000) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'totalAmount inválido (COP).' }));
    }
    if (!items.length) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'items es obligatorio.' }));
    }

    const idNumber = cleanDoc(clientIn.idNumber || clientIn.document);
    if (idNumber.length < 5) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'Cédula (idNumber) obligatoria para Addi.' }));
    }

    const cellphone = cleanPhone(clientIn.cellphone || clientIn.phone);
    if (cellphone.length < 10) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'Celular colombiano de 10 dígitos obligatorio.' }));
    }

    const { firstName, lastName } = splitName(clientIn.fullName || clientIn.firstName);
    const email = String(clientIn.email || '')
      .trim()
      .toLowerCase();
    if (!email || !email.includes('@')) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'email obligatorio.' }));
    }

    const address = toAddress(body.shippingAddress || clientIn.address || {});
    const shippingAmount = Number(body.shippingAmount || 0) || 0;

    const token = await getAddiAccessToken();

    const payload = {
      orderId,
      totalAmount: totalAmount.toFixed(1),
      shippingAmount: shippingAmount.toFixed(1),
      totalTaxesAmount: '0.0',
      currency: 'COP',
      items: items.map((it, idx) => ({
        sku: String(it.sku || it.id || `item-${idx}`).substring(0, 50),
        name: removeAccents(String(it.name || it.title || 'Producto')).substring(0, 50),
        quantity: String(Math.max(1, parseInt(it.quantity, 10) || 1)),
        unitPrice: Math.round(Number(it.unitPrice || it.price) || 0),
        tax: 0,
        pictureUrl: String(it.pictureUrl || it.image || `${cfg.siteUrl}/images/Addi.png`),
        category: String(it.category || 'energia-solar'),
        brand: removeAccents(String(it.brand || 'Reiki Solar')).substring(0, 50),
      })),
      client: {
        idType: String(clientIn.idType || 'CC'),
        idNumber,
        firstName: removeAccents(firstName).substring(0, 50),
        lastName: removeAccents(lastName).substring(0, 50),
        email,
        cellphone,
        cellphoneCountryCode: '+57',
        address,
      },
      shippingAddress: address,
      billingAddress: address,
      allyUrlRedirection: {
        logoUrl: cfg.logoUrl,
        callbackUrl: `${cfg.siteUrl}/api/addi-webhook`,
        redirectionUrl: `${cfg.siteUrl}/respuesta-pago?gateway=addi&orderId=${encodeURIComponent(orderId)}`,
      },
    };

    const addiRes = await fetch(`${cfg.apiUrl}/v1/online-applications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'ReikiSolar/1.0',
      },
      body: JSON.stringify(payload),
      redirect: 'manual',
    });

    const location = addiRes.headers.get('location') || addiRes.headers.get('Location');
    let data = {};
    const text = await addiRes.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    let redirectUrl =
      location ||
      data.redirectionUrl ||
      data.applicationUrl ||
      data.initPoint ||
      data._links?.webRedirect?.href ||
      null;

    if (addiRes.status >= 400 || !redirectUrl) {
      res.statusCode = addiRes.status >= 400 ? addiRes.status : 502;
      return res.end(
        JSON.stringify({
          ok: false,
          error: data.message || data.error || 'Addi no devolvió URL de checkout.',
          details: data,
          status: addiRes.status,
        })
      );
    }

    res.statusCode = 200;
    return res.end(
      JSON.stringify({
        ok: true,
        redirectUrl,
        orderId,
        environment: cfg.isSandbox ? 'sandbox' : 'production',
      })
    );
  } catch (err) {
    console.error('[addi-checkout]', err);
    res.statusCode = 500;
    return res.end(
      JSON.stringify({
        ok: false,
        error: err.message || 'Error creando checkout Addi.',
      })
    );
  }
}
