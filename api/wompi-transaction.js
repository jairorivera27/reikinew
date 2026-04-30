/**
 * Vercel serverless: consulta GET /v1/transactions/{id} autenticada con la llave privada.
 * Respaldo cuando el navegador no puede llamar production.wompi.co (p. ej. CORS/red).
 *
 * Variables: WOMPI_PRIVATE_KEY = prv_prod_… o prv_test_… (mismo ambiente que el pago).
 * @see https://docs.wompi.co/en/docs/colombia/widget-checkout-web/
 */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Solo se admite GET.' }));
  }

  try {
    const incoming = String(req.url || '');
    const pathAndQuery = incoming.includes('://') ? new URL(incoming).search : incoming.split('?').slice(1).join('?');
    const url = pathAndQuery ? new URL('http://x?' + pathAndQuery) : new URL('http://x');
    const id = String(url.searchParams.get('id') || '').trim();
    if (!id) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'Falta el parámetro id.' }));
    }

    const isSandbox = url.searchParams.get('env') === 'sandbox';
    const baseHost = isSandbox ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';
    const prv = String(process.env.WOMPI_PRIVATE_KEY || '').trim();
    if (!prv) {
      res.statusCode = 503;
      return res.end(
        JSON.stringify({
          ok: false,
          error:
            'WOMPI_PRIVATE_KEY no está en Vercel. Agrégala (prv_prod_… / prv_test_) para poder consultar el estado aquí cuando el navegador no llega directo a Wompi.',
        })
      );
    }

    const wompiUrl = `${baseHost}/v1/transactions/${encodeURIComponent(id)}`;
    const wRes = await fetch(wompiUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${prv}` },
    });
    const text = await wRes.text();
    res.statusCode = wRes.status;
    return res.end(text);
  } catch (_e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'Error interno consultando Wompi.' }));
  }
}
