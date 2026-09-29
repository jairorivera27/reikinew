#!/usr/bin/env node
/**
 * Busca compras guardadas (carrito Wompi / Addi) en Redis/KV.
 *
 * Uso:
 *   node scripts/buscar-compra.mjs --nombre "Juan Pérez" --fecha 2026-09-27 --documento 1234567890
 *   node scripts/buscar-compra.mjs --dias 3
 *
 * Requiere en .env (mismas vars que Vercel):
 *   KV_REST_API_URL + KV_REST_API_TOKEN  (o UPSTASH_*)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchCheckoutOrders, listRecentCheckoutOrders } from '../api/_lib/checkout-order-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvFile() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const out = { dias: 3 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--nombre' || a === '-n') out.nombre = argv[++i];
    else if (a === '--documento' || a === '--doc' || a === '-d') out.documento = argv[++i];
    else if (a === '--fecha' || a === '-f') out.fecha = argv[++i];
    else if (a === '--dias') out.dias = Number(argv[++i]) || 3;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printOrder(o) {
  const addr = o.shippingAddress || {};
  console.log('---');
  console.log('Pedido:', o.orderId);
  console.log('Pasarela:', o.gateway, '| Estado:', o.status);
  console.log('Fecha:', o.createdAt, o.paidAt ? `(pagado ${o.paidAt})` : '');
  console.log('Total:', o.totalAmount != null ? '$ ' + Number(o.totalAmount).toLocaleString('es-CO') : '—');
  console.log('Cliente:', o.client?.fullName || '—');
  console.log('Documento:', o.client?.idNumber || '—');
  console.log('Celular:', o.client?.phone || '—');
  console.log('Correo:', o.client?.email || '—');
  if (addr.lineOne || addr.city) console.log('Envío:', [addr.lineOne, addr.city].filter(Boolean).join(', '));
  if (o.wompiTransactionId) console.log('Tx Wompi:', o.wompiTransactionId);
  if (o.addiApplicationId) console.log('Addi app:', o.addiApplicationId);
  if (Array.isArray(o.items) && o.items.length) {
    console.log(
      'Items:',
      o.items.map((it) => `${it.quantity || 1}× ${it.name || it.title || it.sku}`).join('; ')
    );
  }
}

loadEnvFile();

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`Uso:
  node scripts/buscar-compra.mjs --nombre "..." --fecha YYYY-MM-DD --documento ...
  node scripts/buscar-compra.mjs --dias 3`);
  process.exit(0);
}

const hasFilter = Boolean(args.nombre || args.documento || args.fecha);
const matches = hasFilter
  ? await searchCheckoutOrders({
      nombre: args.nombre,
      documento: args.documento,
      fecha: args.fecha,
      dias: args.dias,
    })
  : await listRecentCheckoutOrders(args.dias);

if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
  console.warn(
    'Aviso: no hay KV_REST_API_URL en .env — solo verás pedidos en memoria de este proceso (vacío salvo pruebas locales).'
  );
}

console.log(`Coincidencias: ${matches.length}`);
if (!matches.length) {
  console.log(
    'Sin resultados en el registro del sitio. Compras anteriores al despliegue: revisa panel Wompi o aliados.addi.com.'
  );
  process.exit(0);
}

for (const o of matches) printOrder(o);
