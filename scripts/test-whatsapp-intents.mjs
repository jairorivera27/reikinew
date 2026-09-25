/**
 * Pruebas de intención WhatsApp (ahorro vs pagar vs catálogo…).
 * Se ejecuta en cada `npm run build` / deploy.
 *
 * Uso: node scripts/test-whatsapp-intents.mjs
 */
import { classifyWhatsAppIntent } from '../api/_lib/whatsapp-intent.js';
import { looksLikeCatalogQuery } from '../api/_lib/whatsapp-catalog.js';

const CASES = [
  { text: 'hola', expect: 'ia' }, // saludo lo maneja el bot antes de classify; classify → ia
  { text: 'quiero instalar paneles solares en mi casa', expect: 'instalar' },
  { text: 'necesito energía solar para mi finca', expect: 'instalar' },
  { text: 'cuánto cuesta un inversor de 5kw', expect: 'catalogo' },
  { text: 'quiero cotizar una batería', expect: 'catalogo' }, // nombra producto → búsqueda cotizar
  { text: 'quiero cotizar', expect: 'cotizar' },
  { text: 'estoy cansado de pagar energía', expect: 'ahorro' },
  { text: 'pago mucho de luz', expect: 'ahorro' },
  { text: 'me llega muy cara la factura de EPM', expect: 'ahorro' },
  { text: 'cuánto me ahorro con paneles', expect: 'ahorro' },
  { text: 'cómo les pago', expect: 'pagar' },
  { text: 'me pasas el número de cuenta', expect: 'pagar' },
  { text: 'ya pagué, dónde mando el comprobante', expect: 'pagar' },
  { text: 'puedo pagar con Addi', expect: 'pagar' },
  { text: 'inversor 5kw', expect: 'catalogo' },
  { text: 'quiero hablar con el ingeniero', expect: 'ingeniero' },
  { text: 'se me va la luz y quiero respaldo', expect: 'respaldo' },
  // Compra: con carrito/cotización activa
  { text: 'lo quiero', expect: 'compra', hasCartOrQuote: true },
  { text: 'cómo compro', expect: 'compra', hasCartOrQuote: true },
  { text: 'quiero comprar la cotización', expect: 'compra', hasCartOrQuote: true },
  // Compra sin carrito → catálogo
  { text: 'lo quiero', expect: 'catalogo', hasCartOrQuote: false },
];

function classify(text, hasCartOrQuote = false) {
  return classifyWhatsAppIntent(text, {
    hasCartOrQuote,
    looksLikeCatalogQuery,
  });
}

let failed = 0;

for (const c of CASES) {
  const got = classify(c.text, Boolean(c.hasCartOrQuote));
  const ok = got === c.expect;
  if (!ok) failed += 1;
  const mark = ok ? 'PASS' : 'FAIL';
  const cartNote = c.hasCartOrQuote != null ? ` [cart=${c.hasCartOrQuote}]` : '';
  console.log(`${mark}  "${c.text}"${cartNote} → ${got} (esperado: ${c.expect})`);
}

console.log('---');
console.log(`Resultado: ${CASES.length - failed}/${CASES.length} OK`);

// formatPhoneCO
import { formatPhoneCO } from '../api/_lib/phone.js';
const phoneCases = [
  ['573245737413', '+57 324 573 7413'],
  ['3245737413', '+57 324 573 7413'],
  ['+57 324 573 7413', '+57 324 573 7413'],
];
for (const [input, expect] of phoneCases) {
  const got = formatPhoneCO(input);
  const ok = got === expect;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  formatPhoneCO(${JSON.stringify(input)}) → ${got} (esperado: ${expect})`);
}

if (failed > 0) {
  console.error('test-whatsapp-intents: FALLÓ');
  process.exit(1);
}

console.log('test-whatsapp-intents: OK');
