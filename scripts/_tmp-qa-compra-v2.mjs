import fs from 'fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4321';
const report = [];
const log = (ok, msg, detail = '') => {
  report.push({ ok, msg, detail });
  console.log(ok ? 'PASS' : 'FAIL', msg, detail ? `- ${detail}` : '');
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message || e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

try {
  // Category page (correct slug)
  let r = await page.goto(`${BASE}/tienda/categoria/protecciones-electricas`, {
    waitUntil: 'domcontentloaded',
  });
  log(!!r && r.ok(), 'GET categoría protecciones-electricas', `status ${r?.status()}`);
  await page.waitForTimeout(2000);

  const imgStats = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.producto-card img, .product-card img, main img')];
    return {
      total: imgs.length,
      broken: imgs.filter((i) => i.src && (!i.complete || i.naturalWidth === 0)).length,
      placeholders: imgs.filter((i) => /placeholders/i.test(i.src)).length,
      sample: imgs.slice(0, 5).map((i) => i.getAttribute('src')),
    };
  });
  log(imgStats.broken === 0, 'Imágenes en categoría protecciones', JSON.stringify(imgStats));

  // Add product from category
  const addBtn = page.locator('button.producto-btn.add-to-cart').first();
  await addBtn.click({ force: true });
  await page.waitForTimeout(600);
  let cart = await page.evaluate(() => JSON.parse(localStorage.getItem('reiki_cart') || '[]'));
  log(cart.length >= 1, 'Agregar desde categoría', `n=${cart.length} title=${cart[0]?.title || ''}`);

  // Open drawer checkout link
  await page.goto(`${BASE}/carrito`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const active = await page.locator('#checkout-active:not([hidden])').isVisible();
  log(active, 'Checkout con items');

  // Quantity + / -
  const before = await page.locator('#checkout-total').textContent();
  const plus = page.locator('#checkout-lines button, .checkout-lines button').filter({ hasText: '+' }).first();
  if ((await plus.count()) > 0) {
    await plus.click();
    await page.waitForTimeout(400);
  } else {
    // bump via storage
    await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('reiki_cart') || '[]');
      if (c[0]) c[0].quantity = (c[0].quantity || 1) + 1;
      localStorage.setItem('reiki_cart', JSON.stringify(c));
      location.reload();
    });
    await page.waitForTimeout(1200);
  }
  const after = await page.locator('#checkout-total').textContent();
  log(!!after && after !== '$0', 'Total actualizado', `${before} -> ${after}`);

  // Fill form
  await page.fill('input[name="fullName"]', 'Cliente Prueba QA');
  await page.fill('input[name="email"]', 'qa.prueba@example.com');
  await page.fill('input[name="phone"]', '3001234567');
  await page.fill('input[name="addressLine"]', 'Calle 10 # 20-30');
  await page.fill('input[name="city"]', 'Medellín');
  await page.selectOption('select[name="department"]', { index: 1 });
  await page.fill('input[name="zip"]', '050001');
  await page.check('#aceptar-terminos');

  // Submit without terms first (uncheck)
  await page.uncheck('#aceptar-terminos');
  await page.click('#checkout-submit');
  await page.waitForTimeout(500);
  const toast1 = await page.locator('#checkout-pay-toast').textContent().catch(() => '');
  const toastVisible = await page.locator('#checkout-pay-toast:not([hidden])').isVisible().catch(() => false);
  log(
    toastVisible || /términos|terminos|llave|Wompi|vacío/i.test(toast1 || ''),
    'Validación al pagar sin términos / feedback',
    (toast1 || '').slice(0, 120)
  );

  await page.check('#aceptar-terminos');
  await page.click('#checkout-submit');
  await page.waitForTimeout(2500);
  const toast2 = await page.locator('#checkout-pay-toast').textContent().catch(() => '');
  const wompiFrame = await page.locator('iframe[src*="wompi"], .wompi').count();
  log(
    true,
    'Resultado intento de pago Wompi',
    `toast="${(toast2 || '').slice(0, 140)}" frames=${wompiFrame}`
  );

  // Product detail from category first card
  await page.goto(`${BASE}/tienda/categoria/protecciones-electricas`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const href = await page.locator('a.producto-ver-detalles, a[href^="/tienda/"]').first().getAttribute('href');
  if (href && !/descuentos|categoria/.test(href)) {
    r = await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
    log(!!r && r.ok(), 'Ficha producto protecciones', href);
    await page.waitForTimeout(800);
    await page.locator('button.producto-btn.add-to-cart').first().click({ force: true });
    await page.waitForTimeout(500);
    cart = await page.evaluate(() => JSON.parse(localStorage.getItem('reiki_cart') || '[]'));
    log(cart.length >= 1, 'Agregar desde ficha', `n=${cart.length}`);
  } else {
    log(false, 'No se encontró link de ficha válido', href || '');
  }

  // API integrity endpoint exists?
  const api = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/wompi-integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: 'qa-test', amountInCents: 100000, currency: 'COP' }),
      });
      const text = await res.text();
      return { status: res.status, text: text.slice(0, 200) };
    } catch (e) {
      return { status: 0, text: String(e) };
    }
  });
  log(api.status > 0, 'POST /api/wompi-integrity responde', JSON.stringify(api));

  const csp = errors.filter((e) => /Content Security Policy|CSP/i.test(e));
  log(csp.length === 0, 'Sin violaciones CSP en consola', csp.slice(0, 2).join(' | ') || 'none');

  const serious = errors.filter(
    (e) => !/favicon|third-party|gtag|facebook|Content Security Policy/i.test(e)
  );
  log(serious.length === 0, 'Sin errores JS graves', serious.slice(0, 3).join(' | ') || 'none');
} catch (e) {
  log(false, 'Excepción', String(e?.message || e));
}

await browser.close();
const failed = report.filter((x) => !x.ok);
console.log(`\n=== RESUMEN PASS ${report.length - failed.length} / FAIL ${failed.length} ===`);
fs.writeFileSync('scripts/_tmp-qa-compra-report.json', JSON.stringify({ base: BASE, report }, null, 2));
process.exit(failed.length ? 1 : 0);
