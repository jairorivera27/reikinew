/**
 * Limpia de Google Merchant Center los productos que ya NO están en la tienda
 * (ocultos, borrados, referencias viejas o de prueba).
 *
 * "Vigentes" = los mismos que sube sync-catalog.mjs (se obtienen ejecutándolo en modo --export,
 * sin enviar nada). Todo producto de Merchant cuyo offerId no esté en esa lista es obsoleto.
 *
 * Uso:
 *   node scripts/google-merchant/limpiar-obsoletos.mjs            → solo revisa y escribe merchant-obsoletos.csv
 *   node scripts/google-merchant/limpiar-obsoletos.mjs --borrar   → borra los obsoletos (productInputs.delete)
 *
 * Borrar un producto de Merchant no toca la web; si se necesita de nuevo, basta con volver a sincronizar.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listProducts } from './insert-product.mjs';
import { getAuthHeaders } from './auth.mjs';
import { MERCHANT_API_BASE } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BORRAR = process.argv.includes('--borrar');
const salidaCsv = path.join(process.env.REIKI_SALIDA || ROOT, 'merchant-obsoletos.csv');

// 1) offerIds vigentes según el catálogo publicado
const tmp = path.join(os.tmpdir(), `merchant-vigentes-${Date.now()}.json`);
execFileSync(process.execPath, [path.join(__dirname, 'sync-catalog.mjs'), `--export=${tmp}`], { stdio: 'ignore' });
const exportados = JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.unlinkSync(tmp);
const lista = Array.isArray(exportados) ? exportados : exportados.productos || exportados.items || Object.values(exportados);
const vigentes = new Set(lista.map((p) => String(p.offerId)));
if (vigentes.size < 100) {
  throw new Error(`Solo ${vigentes.size} productos vigentes: algo anda mal con el catálogo, no se borra nada.`);
}

// 2) productos en Merchant
const { products } = await listProducts({ limit: 10000, pageSize: 250 });
const obsoletos = products.filter((p) => !vigentes.has(String(p.offerId)));

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
fs.writeFileSync(
  salidaCsv,
  '﻿offerId;titulo;enlace;fuente_de_datos\n' +
    obsoletos.map((p) => [p.offerId, p.productAttributes?.title, p.productAttributes?.link, p.dataSource].map(esc).join(';')).join('\n'),
  'utf8'
);
console.log(`Merchant: ${products.length} productos · vigentes en la tienda: ${vigentes.size} · obsoletos: ${obsoletos.length}`);
console.log(`Lista: ${salidaCsv}`);

if (!BORRAR) {
  console.log('Modo revisión: no se borró nada. Para borrar: --borrar');
  process.exit(0);
}

// 3) borrar
const headers = await getAuthHeaders();
let ok = 0;
const fallos = [];
for (const p of obsoletos) {
  const nombreInput = String(p.name).replace('/products/', '/productInputs/');
  const url = new URL(`${MERCHANT_API_BASE}/${nombreInput}`);
  url.searchParams.set('dataSource', p.dataSource);
  const res = await fetch(url, { method: 'DELETE', headers });
  if (res.ok) ok++;
  else {
    const data = await res.json().catch(() => ({}));
    fallos.push(`${p.offerId} · ${p.dataSource} · ${res.status} ${data?.error?.message || ''}`);
  }
  await new Promise((r) => setTimeout(r, 120));
}
console.log(`Borrados: ${ok} · con error: ${fallos.length}`);
for (const f of fallos.slice(0, 40)) console.log('  ✗', f);
