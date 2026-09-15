/**
 * Helpers compartidos Addi (OAuth + URLs sandbox/prod).
 * Usado por api/addi-checkout.js y api/addi-webhook.js
 */

export function getAddiConfig() {
  const env = String(process.env.ADDI_ENV || 'sandbox').toLowerCase();
  const isSandbox = env !== 'production' && env !== 'prod';
  return {
    isSandbox,
    clientId: String(process.env.ADDI_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.ADDI_CLIENT_SECRET || '').trim(),
    authUrl: isSandbox ? 'https://auth.addi-staging.com' : 'https://auth.addi.com',
    apiUrl: isSandbox ? 'https://api.addi-staging.com' : 'https://api.addi.com',
    audience: 'https://api.addi.com',
    siteUrl: String(process.env.ADDI_SITE_URL || process.env.SITE_URL || 'https://reikisolar.com.co').replace(
      /\/$/,
      ''
    ),
    logoUrl: String(
      process.env.ADDI_LOGO_URL || 'https://reikisolar.com.co/images/Addi.png'
    ),
  };
}

export function removeAccents(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * @returns {Promise<string>}
 */
export async function getAddiAccessToken() {
  const cfg = getAddiConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error(
      'Faltan ADDI_CLIENT_ID / ADDI_CLIENT_SECRET. Addi las envía al aliarte (integraciones@addi.com).'
    );
  }

  const res = await fetch(`${cfg.authUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      audience: cfg.audience,
      grant_type: 'client_credentials',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const msg = data?.error_description || data?.error || data?.message || res.statusText;
    throw new Error(`Addi OAuth ${res.status}: ${msg}`);
  }
  return String(data.access_token);
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw || '{}');
}
