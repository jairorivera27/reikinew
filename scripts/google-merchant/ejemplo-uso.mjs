/**
 * Ejemplo Merchant API v1:
 *   1. MERCHANT_ID + DATA_SOURCE_ID en config.mjs
 *   2. secrets/google-merchant-service-account.json
 *   3. Habilitar merchantapi.googleapis.com en GCP
 *   4. node scripts/google-merchant/ejemplo-uso.mjs
 *   5. node scripts/google-merchant/ejemplo-uso.mjs --insert
 */
import { getAccessToken, getServiceAccountAuth } from './auth.mjs';
import {
  buildMerchantProductResource,
  insertProduct,
  listProducts,
} from './insert-product.mjs';
import {
  MERCHANT_ID,
  DATA_SOURCE_ID,
  SERVICE_ACCOUNT_PATH,
  dataSourceName,
} from './config.mjs';

const doInsert = process.argv.includes('--insert');

const panelEjemplo = {
  offerId: 'JKM585N-72HL4-V',
  title: 'Panel solar Jinko Tiger Neo 585W',
  description:
    'Módulo monocristalino N-Type Tiger Neo de 585W para instalaciones residenciales y comerciales en Colombia.',
  link: '/tienda/jinko-tiger-neo-585w',
  imageLink: '/images/productos-tienda/paneles-solares/jinko-tiger-neo-585w.png',
  price: '431250',
  brand: 'Jinko Solar',
  mpn: 'JKM585N-72HL4-V',
  stock: 'disponible',
  productType: 'Paneles Solares',
  googleProductCategory: '632',
};

const inversorEjemplo = {
  offerId: 'SUN2000-10K-LC0',
  title: 'Inversor Huawei SUN2000-10K-LC0',
  description:
    'Inversor string Huawei SUN2000 10 kW para sistemas fotovoltaicos conectados a red en Colombia.',
  link: '/tienda/huawei-sun2000-10k-lc0',
  imageLink: '/images/productos-tienda/inversores/huawei-sun2000.png',
  price: 8500000,
  brand: 'Huawei',
  mpn: 'SUN2000-10K-LC0',
  stock: 'disponible',
  productType: 'Inversores',
  googleProductCategory: '275',
};

async function main() {
  console.log('API: Google Merchant API (products/v1)');
  console.log('Service account JSON:', SERVICE_ACCOUNT_PATH);
  console.log('MERCHANT_ID:', MERCHANT_ID);
  console.log('DATA_SOURCE_ID:', DATA_SOURCE_ID);
  console.log('dataSource:', dataSourceName());

  const { projectId } = await getServiceAccountAuth();
  console.log('GCP project_id:', projectId || '(desconocido)');

  const { token } = await getAccessToken();
  console.log('Access token OK (length):', token.length);

  try {
    const listed = await listProducts({ pageSize: 2, limit: 2 });
    console.log('Auth + list OK. Productos:', listed.products?.length ?? 0);
    if (listed.products?.[0]) {
      console.log('  ejemplo name:', listed.products[0].name);
    }
  } catch (err) {
    console.warn('list falló:', err.message);
    if (/merchantapi\.googleapis\.com|has not been used|disabled/i.test(err.message)) {
      console.warn(
        '→ Habilita Merchant API: https://console.developers.google.com/apis/api/merchantapi.googleapis.com/overview?project=dotted-saga-446020-m0'
      );
    }
  }

  console.log('\nPayload panel (Merchant API ProductInput):');
  console.log(JSON.stringify(buildMerchantProductResource(panelEjemplo), null, 2));

  if (!doInsert) {
    console.log('\nDry-run. Para insertar:');
    console.log('  node scripts/google-merchant/ejemplo-uso.mjs --insert');
    return;
  }

  console.log('\nInsertando panel…');
  const panelRes = await insertProduct(panelEjemplo);
  console.log('Insertado:', panelRes.name || panelRes.offerId);

  console.log('Insertando inversor…');
  const invRes = await insertProduct(inversorEjemplo);
  console.log('Insertado:', invRes.name || invRes.offerId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
