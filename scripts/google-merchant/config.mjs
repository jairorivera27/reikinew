/**
 * Configuración Google Merchant API (Products v1)
 *
 * IMPORTANTE
 * ----------
 * 1. MERCHANT_ID = ID de Merchant Center (Información de la cuenta).
 * 2. DATA_SOURCE_ID = ID de la fuente de datos tipo API (obligatorio para inserts).
 * 3. El JSON de la Service Account NO debe subirse a git (secrets/ en .gitignore).
 * 4. En Merchant Center: Personas y acceso → agregar el client_email de la SA.
 * 5. En Google Cloud: habilitar "Merchant API" (merchantapi.googleapis.com).
 *    https://console.developers.google.com/apis/api/merchantapi.googleapis.com/overview?project=dotted-saga-446020-m0
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

/** @type {string} Merchant Center → Información de la cuenta → ID */
export const MERCHANT_ID = '5850111039';

/**
 * ID de la fuente de datos API en Merchant Center.
 * Formato completo en requests: accounts/{MERCHANT_ID}/dataSources/{DATA_SOURCE_ID}
 */
export const DATA_SOURCE_ID = '10726926649';

/**
 * Ruta al JSON de la Service Account.
 * Default: secrets/google-merchant-service-account.json
 * Override: GOOGLE_APPLICATION_CREDENTIALS
 */
export const SERVICE_ACCOUNT_PATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(ROOT, 'secrets', 'google-merchant-service-account.json');

/** Dominio público (links e imágenes absolutos). */
export const SITE_URL = 'https://reikisolar.com.co';

/** País / feed label (Colombia). */
export const FEED_LABEL = 'CO';

/** Idioma del contenido. */
export const CONTENT_LANGUAGE = 'es';

/**
 * Base REST Merchant API — Products sub-API v1
 * Insert: POST {MERCHANT_API_BASE}/accounts/{id}/productInputs:insert?dataSource=...
 * List:   GET  {MERCHANT_API_BASE}/accounts/{id}/products
 */
export const MERCHANT_API_BASE = 'https://merchantapi.googleapis.com/products/v1';

/** OAuth scope de Merchant API (mismo que usaba Content API). */
export const MERCHANT_API_SCOPE = 'https://www.googleapis.com/auth/content';

export function assertMerchantIdConfigured() {
  if (!MERCHANT_ID || MERCHANT_ID === 'TU_MERCHANT_ID_AQUI') {
    throw new Error(
      'Configura MERCHANT_ID en scripts/google-merchant/config.mjs (Merchant Center → Información de la cuenta).'
    );
  }
}

export function assertDataSourceConfigured() {
  if (!DATA_SOURCE_ID || DATA_SOURCE_ID === 'TU_DATA_SOURCE_ID_AQUI') {
    throw new Error(
      'Configura DATA_SOURCE_ID en scripts/google-merchant/config.mjs (fuente de datos tipo API).'
    );
  }
}

/** accounts/{merchantId} */
export function accountParent(merchantId = MERCHANT_ID) {
  return `accounts/${merchantId}`;
}

/** accounts/{merchantId}/dataSources/{dataSourceId} */
export function dataSourceName(merchantId = MERCHANT_ID, dataSourceId = DATA_SOURCE_ID) {
  assertDataSourceConfigured();
  return `accounts/${merchantId}/dataSources/${dataSourceId}`;
}
