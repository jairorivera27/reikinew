/**
 * Autenticación Google Merchant API con Service Account.
 * Scope: https://www.googleapis.com/auth/content
 */
import fs from 'node:fs';
import { GoogleAuth } from 'google-auth-library';
import { MERCHANT_API_SCOPE, SERVICE_ACCOUNT_PATH } from './config.mjs';

/**
 * @returns {GoogleAuth}
 */
export function createGoogleAuth() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(
      `No se encontró el JSON de la Service Account en:\n  ${SERVICE_ACCOUNT_PATH}\n` +
        'Coloca el archivo en secrets/google-merchant-service-account.json ' +
        'o define GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  return new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: [MERCHANT_API_SCOPE],
  });
}

/**
 * @returns {Promise<{ token: string, projectId: string|null, auth: GoogleAuth }>}
 */
export async function getAccessToken() {
  const auth = createGoogleAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;

  if (!token) {
    throw new Error('No se pudo obtener un access token con la Service Account.');
  }

  const projectId = await auth.getProjectId().catch(() => null);
  return { token, projectId, auth };
}

/**
 * @returns {Promise<Record<string, string>>}
 */
export async function getAuthHeaders() {
  const { token } = await getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Cliente OAuth + projectId (debug).
 */
export async function getServiceAccountAuth() {
  const auth = createGoogleAuth();
  const client = await auth.getClient();
  const projectId = await auth.getProjectId().catch(() => null);
  return { auth, client, projectId };
}
