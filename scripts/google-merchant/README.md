# Google Merchant API — Products v1

Integración **solo** con la nueva **Merchant API** (Content API for Shopping deprecada).

## Endpoints

| Acción | Método |
|---|---|
| Insertar producto | `POST …/products/v1/accounts/{MERCHANT_ID}/productInputs:insert?dataSource=accounts/{MERCHANT_ID}/dataSources/{DATA_SOURCE_ID}` |
| Listar productos + status | `GET …/products/v1/accounts/{MERCHANT_ID}/products` |

Base: `https://merchantapi.googleapis.com/products/v1`

## Configuración (`config.mjs`)

```js
export const MERCHANT_ID = '5850111039';       // ← ID de Merchant Center
export const DATA_SOURCE_ID = '10726926649';   // ← ID fuente de datos API
```

## Requisitos

1. Service Account JSON en `secrets/google-merchant-service-account.json` (gitignored).
2. En Merchant Center → **Personas y acceso** → agregar el `client_email` de la SA.
3. En Google Cloud → habilitar **Merchant API**:
   https://console.developers.google.com/apis/api/merchantapi.googleapis.com/overview?project=dotted-saga-446020-m0
4. Fuente de datos tipo **API** (ya tienes `10726926649`).

## Uso

```bash
# Auth + preview payload
npm run merchant:auth-test

# Insertar 2 ejemplos
npm run merchant:insert-ejemplo

# Sync catálogo real (con imágenes absolutas)
npm run merchant:sync-catalog:dry
npm run merchant:sync-catalog

# Diagnóstico de no aprobados (productStatus)
npm run merchant:diagnose
```

## Código

```js
import { insertProduct } from './insert-product.mjs';

await insertProduct({
  offerId: 'SKU-O-SLUG',          // máx. 50 chars
  title: 'Panel solar …',
  description: '…',
  link: '/tienda/mi-producto',
  imageLink: '/images/productos-tienda/…',
  price: '431250',                // COP → amountMicros automático
  brand: 'Jinko Solar',
  stock: 'disponible',            // → IN_STOCK
  productType: 'Paneles Solares',
  googleProductCategory: '632',
});
```

## Archivos

| Archivo | Rol |
|---|---|
| `config.mjs` | `MERCHANT_ID`, `DATA_SOURCE_ID`, bases URL |
| `auth.mjs` | Service Account → Bearer token |
| `insert-product.mjs` | `buildMerchantProductResource` + `insertProduct` + `listProducts` |
| `sync-catalog.mjs` | Sync masivo desde `src/content/productos` |
| `diagnose-disapproved.mjs` | Issues / pendientes vía `productStatus` |
| `ejemplo-uso.mjs` | Smoke test |

## Cambios vs Content API

| Content API (vieja) | Merchant API (nueva) |
|---|---|
| `products.insert` | `productInputs.insert` + `dataSource` |
| campos top-level (`title`, `price`) | `productAttributes.{…}` |
| `price.value` | `price.amountMicros` |
| `targetCountry` | `feedLabel` |
| `availability: "in stock"` | `availability: "IN_STOCK"` |
| `productstatuses.list` | `products.list` → `productStatus` |
| `custombatch` | inserts paralelos individuales |
