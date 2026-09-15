/**
 * Google Merchant API — Products v1
 *
 * Inserta productos con productInputs.insert (reemplazo de Content API products.insert).
 *
 * POST https://merchantapi.googleapis.com/products/v1/accounts/{MERCHANT_ID}/productInputs:insert
 *   ?dataSource=accounts/{MERCHANT_ID}/dataSources/{DATA_SOURCE_ID}
 *
 * Docs:
 * - https://developers.google.com/merchant/api/guides/products/add-manage
 * - https://developers.google.com/merchant/api/reference/rest/products_v1/accounts.productInputs/insert
 */
import { getAuthHeaders } from './auth.mjs';
import {
  MERCHANT_ID,
  SITE_URL,
  MERCHANT_API_BASE,
  FEED_LABEL,
  CONTENT_LANGUAGE,
  accountParent,
  dataSourceName,
  assertMerchantIdConfigured,
  assertDataSourceConfigured,
} from './config.mjs';

/**
 * @typedef {Object} MerchantProductInput
 * @property {string} offerId
 * @property {string} title
 * @property {string} description
 * @property {string} link
 * @property {string} imageLink
 * @property {string|number} price
 * @property {string|number} [salePrice]
 * @property {string} [currency]
 * @property {string} [brand]
 * @property {string} [gtin]
 * @property {string} [mpn]
 * @property {'disponible'|'agotado'|'pre-orden'|string} [stock]
 * @property {string} [condition]
 * @property {string} [googleProductCategory]
 * @property {string} [productType]
 * @property {string[]} [additionalImageLinks]
 * @property {string} [contentLanguage]
 * @property {string} [feedLabel]
 * @property {string} [availabilityDate]  Requerido si stock = pre-orden (ISO date)
 */

function normalizePriceValue(price) {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return String(Math.round(price));
  }
  const digits = String(price ?? '').replace(/[^\d]/g, '');
  if (!digits) throw new Error('price es obligatorio y debe contener dígitos (COP).');
  return digits;
}

/** Merchant API: amountMicros = valor * 1_000_000 */
function toMerchantPrice(price, currency = 'COP') {
  const value = normalizePriceValue(price);
  return {
    amountMicros: `${value}000000`,
    currencyCode: currency,
  };
}

function toAbsoluteUrl(href) {
  if (!href) throw new Error('link / imageLink es obligatorio.');
  if (/^https?:\/\//i.test(href)) return href;
  const base = SITE_URL.replace(/\/$/, '');
  const pathPart = href.startsWith('/') ? href : `/${href}`;
  return `${base}${pathPart}`;
}

function toAvailability(stock) {
  switch (String(stock || 'disponible').toLowerCase()) {
    case 'agotado':
    case 'out of stock':
      return 'OUT_OF_STOCK';
    case 'pre-orden':
    case 'preorder':
      return 'PREORDER';
    default:
      return 'IN_STOCK';
  }
}

/**
 * Construye el cuerpo ProductInput de Merchant API v1.
 * @param {MerchantProductInput} input
 */
export function buildMerchantProductResource(input) {
  if (!input?.offerId) throw new Error('offerId es obligatorio (usa SKU o slug ≤ 50 chars).');
  if (String(input.offerId).length > 50) {
    throw new Error(`offerId demasiado largo (>50): ${input.offerId}`);
  }
  if (!input?.title) throw new Error('title es obligatorio.');
  if (!input?.description) throw new Error('description es obligatorio.');

  const currency = input.currency || 'COP';
  const availability = toAvailability(input.stock);

  /** @type {Record<string, unknown>} */
  const productAttributes = {
    title: String(input.title).slice(0, 150),
    description: String(input.description).slice(0, 5000),
    link: toAbsoluteUrl(input.link),
    imageLink: toAbsoluteUrl(input.imageLink),
    availability,
    condition: 'NEW',
    price: toMerchantPrice(input.price, currency),
  };

  if (input.salePrice != null && String(input.salePrice).trim() !== '') {
    productAttributes.salePrice = toMerchantPrice(input.salePrice, currency);
  }
  if (availability === 'PREORDER' && input.availabilityDate) {
    productAttributes.availabilityDate = String(input.availabilityDate);
  }
  if (input.brand) productAttributes.brand = String(input.brand);
  if (input.gtin) productAttributes.gtins = [String(input.gtin)];
  if (input.mpn) {
    const mpn = String(input.mpn).slice(0, 70);
    productAttributes.mpn = mpn;
  }
  if (input.googleProductCategory) {
    productAttributes.googleProductCategory = String(input.googleProductCategory);
  }
  if (input.productType) productAttributes.productTypes = [String(input.productType)];
  if (input.additionalImageLinks?.length) {
    productAttributes.additionalImageLinks = input.additionalImageLinks.map(toAbsoluteUrl);
  }

  return {
    offerId: String(input.offerId),
    contentLanguage: input.contentLanguage || CONTENT_LANGUAGE,
    feedLabel: input.feedLabel || FEED_LABEL,
    productAttributes,
  };
}

function resolveMerchantId(override) {
  const merchantId = override || MERCHANT_ID;
  if (!override) assertMerchantIdConfigured();
  if (!merchantId || merchantId === 'TU_MERCHANT_ID_AQUI') {
    throw new Error('Falta MERCHANT_ID en scripts/google-merchant/config.mjs');
  }
  return String(merchantId);
}

async function merchantFetch(url, init = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * Lista productos procesados (incluye productStatus).
 * @param {object} [options]
 * @param {string} [options.merchantId]
 * @param {number} [options.pageSize]
 * @param {string} [options.pageToken]
 * @param {number} [options.limit]  Máximo total a acumular (paginado).
 */
export async function listProducts(options = {}) {
  const merchantId = resolveMerchantId(options.merchantId);
  const pageSize = Math.min(options.pageSize || options.maxResults || 25, 1000);
  const limit = options.limit || pageSize;

  /** @type {any[]} */
  const products = [];
  let pageToken = options.pageToken;

  do {
    const url = new URL(`${MERCHANT_API_BASE}/${accountParent(merchantId)}/products`);
    url.searchParams.set('pageSize', String(Math.min(pageSize, limit - products.length)));
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const { res, data } = await merchantFetch(url);
    if (!res.ok) {
      const msg = data?.error?.message || JSON.stringify(data) || res.statusText;
      throw new Error(`products.list ${res.status}: ${msg}`);
    }

    products.push(...(data.products || []));
    pageToken = data.nextPageToken;
    if (products.length >= limit) break;
  } while (pageToken);

  return {
    products: products.slice(0, limit),
    resources: products.slice(0, limit), // alias compat
    nextPageToken: pageToken,
  };
}

/**
 * Alias: en Merchant API el status vive en product.productStatus
 * (ya no existe productstatuses.list de Content API).
 */
export async function listProductStatuses(options = {}) {
  const { products } = await listProducts({
    ...options,
    limit: options.limit || 5000,
    pageSize: 250,
  });

  return products.map((p) => ({
    name: p.name,
    productId: p.name,
    offerId: p.offerId,
    title: p.productAttributes?.title,
    link: p.productAttributes?.link,
    imageLink: p.productAttributes?.imageLink,
    productStatus: p.productStatus,
    destinationStatuses: p.productStatus?.destinationStatuses || [],
    itemLevelIssues: p.productStatus?.itemLevelIssues || [],
  }));
}

/**
 * Inserta (o reemplaza) un producto vía productInputs.insert.
 *
 * @param {MerchantProductInput} productInput
 * @param {object} [options]
 * @param {string} [options.merchantId]
 * @param {string} [options.dataSourceId]
 * @returns {Promise<object>}
 */
export async function insertProduct(productInput, options = {}) {
  const merchantId = resolveMerchantId(options.merchantId);
  assertDataSourceConfigured();
  const ds = dataSourceName(merchantId, options.dataSourceId);
  const body = buildMerchantProductResource(productInput);

  // ↓↓↓ MERCHANT ID + DATA SOURCE ID en la URL ↓↓↓
  const url = new URL(
    `${MERCHANT_API_BASE}/${accountParent(merchantId)}/productInputs:insert`
  );
  url.searchParams.set('dataSource', ds);

  const { res, data } = await merchantFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data) || res.statusText;
    throw new Error(`productInputs.insert ${res.status}: ${msg}`);
  }

  return data;
}

/**
 * Inserta varios productos en paralelo (Merchant API no tiene custombatch).
 * @param {MerchantProductInput[]} productInputs
 * @param {object} [options]
 * @param {number} [options.concurrency]
 */
export async function insertProductsBatch(productInputs, options = {}) {
  if (!productInputs?.length) return { ok: 0, errors: [] };

  const concurrency = Math.max(1, Math.min(options.concurrency || 6, 15));
  let ok = 0;
  /** @type {Array<{ offerId: string, message: string }>} */
  const errors = [];
  let index = 0;

  async function worker() {
    while (index < productInputs.length) {
      const i = index++;
      const input = productInputs[i];
      try {
        await insertProduct(input, options);
        ok += 1;
      } catch (err) {
        errors.push({
          offerId: String(input.offerId || '?'),
          message: err.message || String(err),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { ok, errors };
}
