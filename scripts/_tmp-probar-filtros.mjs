import { chromium } from 'playwright';

const BASE = 'http://localhost:4399';
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 950 } });

const errores = [];
pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
pagina.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));

const contar = () => pagina.locator('.cat-grid .producto-card').count();
const texto = () => pagina.locator('[data-filtros-resultado]').innerText();

async function esperar(ms = 700) {
  await pagina.waitForTimeout(ms);
}

console.log('=== FILTROS EN /tienda/categoria/inversores/ ===\n');
await pagina.goto(`${BASE}/tienda/categoria/inversores/`, { waitUntil: 'networkidle' });

console.log(`estado inicial (HTML estatico): ${await contar()} tarjetas · "${await texto()}"`);
console.log(`paginacion visible: ${await pagina.locator('.paginacion').isVisible()}`);

// 1. Abrir el panel
await pagina.click('[data-filtros-toggle]');
console.log(`\npanel abierto: ${await pagina.locator('[data-filtros-panel]').isVisible()}`);

// 2. Filtrar por marca
await pagina.locator('[data-filtro-marca][value="Huawei"]').check();
await esperar();
console.log(`\nfiltro marca=Huawei -> ${await contar()} tarjetas · "${await texto()}"`);
console.log(`  paginacion oculta: ${!(await pagina.locator('.paginacion').isVisible())}`);
console.log(`  URL: ${new URL(pagina.url()).search}`);
const marcas = await pagina.locator('.cat-grid .producto-marca-gris').allInnerTexts();
console.log(`  marcas distintas en el grid: ${[...new Set(marcas)].join(', ') || '(ninguna)'}`);

// 3. Sumar una segunda marca
await pagina.locator('[data-filtro-marca][value="Growatt"]').check();
await esperar();
const marcas2 = await pagina.locator('.cat-grid .producto-marca-gris').allInnerTexts();
console.log(`\n+ marca=Growatt -> ${await contar()} tarjetas · "${await texto()}"`);
console.log(`  marcas distintas: ${[...new Set(marcas2)].join(', ')}`);

// 4. Rango de precio
await pagina.fill('[data-filtro-precio-min]', '3000000');
await pagina.fill('[data-filtro-precio-max]', '8000000');
await esperar(900);
console.log(`\n+ precio 3M-8M -> ${await contar()} tarjetas · "${await texto()}"`);
const precios = await pagina.locator('.cat-grid .producto-price').allInnerTexts();
const numeros = precios.map((p) => parseInt(p.replace(/[^0-9]/g, ''), 10));
console.log(`  rango real: $${Math.min(...numeros).toLocaleString('es-CO')} – $${Math.max(...numeros).toLocaleString('es-CO')}`);
console.log(`  dentro del rango pedido: ${numeros.every((n) => n >= 3000000 && n <= 8000000)}`);

// 5. Ordenar
await pagina.selectOption('[data-filtro-orden]', 'precio-asc');
await esperar();
const asc = (await pagina.locator('.cat-grid .producto-price').allInnerTexts()).map((p) => parseInt(p.replace(/[^0-9]/g, ''), 10));
console.log(`\norden=precio-asc -> ordenado ascendente: ${asc.every((n, i) => i === 0 || asc[i - 1] <= n)}`);
console.log(`  primeros: ${asc.slice(0, 4).map((n) => '$' + n.toLocaleString('es-CO')).join('  ')}`);

// 6. Potencia
await pagina.selectOption('[data-filtro-orden]', 'valor');
await pagina.fill('[data-filtro-precio-min]', '');
await pagina.fill('[data-filtro-precio-max]', '');
await pagina.locator('[data-filtro-marca][value="Huawei"]').uncheck();
await pagina.locator('[data-filtro-marca][value="Growatt"]').uncheck();
await pagina.fill('[data-filtro-potencia-min]', '3000');
await pagina.fill('[data-filtro-potencia-max]', '6000');
await esperar(900);
console.log(`\nsolo potencia 3000-6000 W -> ${await contar()} tarjetas · "${await texto()}"`);

// 7. Sin resultados
await pagina.fill('[data-filtro-potencia-min]', '999999');
await pagina.fill('[data-filtro-potencia-max]', '');
await esperar(900);
console.log(`\npotencia imposible -> estado vacio visible: ${await pagina.locator('.filtros-vacio').isVisible()}`);

// 8. Limpiar restaura el HTML estatico
await pagina.click('.filtros-vacio [data-filtros-limpiar]');
await esperar();
console.log(`\ntras limpiar -> ${await contar()} tarjetas · "${await texto()}"`);
console.log(`  paginacion de vuelta: ${await pagina.locator('.paginacion').isVisible()}`);
console.log(`  URL limpia: ${pagina.url().endsWith('/tienda/categoria/inversores/')}`);

// 9. Boton "ver mas"
await pagina.locator('[data-filtro-marca][value="Victron"]').check();
await esperar();
const antes = await contar();
const hayMas = await pagina.locator('[data-filtros-mas]').count();
console.log(`\nmarca=Victron -> ${antes} tarjetas, boton "ver mas": ${hayMas > 0 ? await pagina.locator('[data-filtros-mas]').innerText() : 'no hace falta'}`);
if (hayMas > 0) {
  await pagina.click('[data-filtros-mas]');
  await esperar(400);
  console.log(`  tras click -> ${await contar()} tarjetas`);
}

// 10. Enlace compartido con filtros en la URL
await pagina.goto(`${BASE}/tienda/categoria/paneles-solares/?marca=JA%20Solar&orden=precio-asc`, { waitUntil: 'networkidle' });
await esperar(900);
console.log(`\n=== ENLACE COMPARTIDO /paneles-solares/?marca=JA Solar&orden=precio-asc ===`);
console.log(`  ${await contar()} tarjetas · "${await texto()}"`);
console.log(`  checkbox rehidratado: ${await pagina.locator('[data-filtro-marca][value="JA Solar"]').isChecked()}`);
console.log(`  select rehidratado: ${await pagina.locator('[data-filtro-orden]').inputValue()}`);

// 11. Carrito sigue funcionando sobre una tarjeta pintada por JS
await pagina.locator('.cat-grid .add-to-cart').first().click();
await esperar(600);
const carrito = await pagina.evaluate(() => JSON.parse(localStorage.getItem('reiki_cart') || '[]'));
console.log(`\n=== CARRITO desde tarjeta generada por los filtros ===`);
console.log(`  items: ${carrito.length}`);
if (carrito[0]) console.log(`  "${carrito[0].title}" · ${carrito[0].price} · marca ${carrito[0].brand || '(vacia)'}`);

// 12. Carruseles de /tienda
await pagina.goto(`${BASE}/tienda`, { waitUntil: 'networkidle' });
console.log(`\n=== /tienda ===`);
console.log(`  badges "Mejor calidad-precio": ${await pagina.locator('.producto-badge-valor').count()}`);
console.log(`  primeras 3 tarjetas de Paneles Solares:`);
const primeros = await pagina.locator('#paneles .producto-card').all();
for (const c of primeros.slice(0, 3)) {
  const t = (await c.locator('.producto-modelo-recuadro').innerText()).slice(0, 44);
  const u = await c.locator('.producto-precio-unitario').count();
  console.log(`      ${t}${u ? '  ·  ' + (await c.locator('.producto-precio-unitario').innerText()) : ''}`);
}

console.log(`\n=== ERRORES DE CONSOLA: ${errores.length} ===`);
for (const e of errores.slice(0, 8)) console.log(`  ${e}`);

await navegador.close();
