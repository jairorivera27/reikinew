import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:4400';
const OUT = path.join(import.meta.dirname, '..', 'auditoria');
fs.mkdirSync(OUT, { recursive: true });

const navegador = await chromium.launch();
const errores = [];

async function auditar(nombre, url, viewport, acciones) {
  const pagina = await navegador.newPage({ viewport });
  pagina.on('pageerror', (e) => errores.push(`${nombre}: ${e.message}`));
  pagina.on('console', (m) => m.type() === 'error' && errores.push(`${nombre}: ${m.text()}`));

  await pagina.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  if (acciones) await acciones(pagina);

  const m = await pagina.evaluate(() => {
    const alturaPagina = document.documentElement.scrollHeight;
    const alturaVista = window.innerHeight;
    const enPrimeraPantalla = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };
    return {
      alturaPagina,
      pantallas: +(alturaPagina / alturaVista).toFixed(1),
      tarjetas: document.querySelectorAll('.producto-card').length,
      imagenes: document.querySelectorAll('img').length,
      imagenesSinLazy: [...document.querySelectorAll('img')].filter((i) => !i.loading || i.loading === 'eager').length,
      botonesAgregar: document.querySelectorAll('.add-to-cart').length,
      hayBuscador: Boolean(document.querySelector('input[type="search"], [data-buscador]')),
      hayFiltros: Boolean(document.querySelector('[data-filtros]')),
      placeholders: [...document.querySelectorAll('img')].filter((i) => i.src.includes('/placeholders/')).length,
      primerH1: document.querySelector('h1')?.textContent?.trim().slice(0, 60) ?? null,
      filtrosEnPrimeraPantalla: enPrimeraPantalla('[data-filtros]'),
      primeraTarjetaEnPrimeraPantalla: enPrimeraPantalla('.producto-card'),
    };
  });

  await pagina.screenshot({ path: path.join(OUT, `${nombre}.png`), fullPage: false });
  await pagina.screenshot({ path: path.join(OUT, `${nombre}-completa.png`), fullPage: true });

  console.log(`\n## ${nombre}  (${viewport.width}×${viewport.height})  ${url}`);
  console.log(`   h1: ${m.primerH1}`);
  console.log(`   alto: ${m.alturaPagina}px = ${m.pantallas} pantallas de scroll`);
  console.log(`   tarjetas visibles en el DOM: ${m.tarjetas}   ·   botones "Agregar": ${m.botonesAgregar}`);
  console.log(`   imágenes: ${m.imagenes} (sin lazy: ${m.imagenesSinLazy}) · con placeholder de categoría: ${m.placeholders}`);
  console.log(`   buscador: ${m.hayBuscador ? 'sí' : 'NO'}   ·   filtros: ${m.hayFiltros ? 'sí' : 'NO'}`);
  if (m.hayFiltros) console.log(`   filtros visibles sin scroll: ${m.filtrosEnPrimeraPantalla}`);
  console.log(`   primera tarjeta visible sin scroll: ${m.primeraTarjetaEnPrimeraPantalla}`);

  await pagina.close();
  return m;
}

const ESCRITORIO = { width: 1440, height: 900 };
const MOVIL = { width: 390, height: 844 };

console.log('=== AUDITORIA VISUAL DE LA TIENDA ===');

await auditar('tienda-escritorio', '/tienda', ESCRITORIO);
await auditar('tienda-movil', '/tienda', MOVIL);
await auditar('categoria-escritorio', '/tienda/categoria/inversores/', ESCRITORIO);
await auditar('categoria-movil', '/tienda/categoria/inversores/', MOVIL);
await auditar('ficha-escritorio', '/tienda/jinko-tiger-neo-585w', ESCRITORIO);
await auditar('ficha-movil', '/tienda/jinko-tiger-neo-585w', MOVIL);
await auditar('descuentos-escritorio', '/tienda/descuentos', ESCRITORIO);

// Filtros abiertos, para ver el panel completo
await auditar('categoria-filtros-abiertos', '/tienda/categoria/inversores/', ESCRITORIO, async (p) => {
  await p.click('[data-filtros-toggle]');
  await p.waitForTimeout(400);
});

console.log('\n\n=== CUANTOS PASOS HAY DESDE LA HOME HASTA AGREGAR AL CARRITO ===');
const pagina = await navegador.newPage({ viewport: ESCRITORIO });
await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle' });

let pasos = 0;
const enlaceTienda = pagina.locator('a[href="/tienda"]').first();
if (await enlaceTienda.count()) {
  await enlaceTienda.click();
  await pagina.waitForLoadState('networkidle');
  pasos++;
  console.log(`   ${pasos}. clic en "Tienda" -> ${new URL(pagina.url()).pathname}`);
}

const agregar = pagina.locator('.add-to-cart').first();
if (await agregar.count()) {
  await agregar.click();
  await pagina.waitForTimeout(600);
  pasos++;
  const carrito = await pagina.evaluate(() => JSON.parse(localStorage.getItem('reiki_cart') || '[]'));
  console.log(`   ${pasos}. clic en "Agregar" -> ${carrito.length} item en el carrito`);
}

console.log(`\n   Total: ${pasos} clics desde la home hasta tener el producto en el carrito.`);

console.log('\n=== ¿SE PUEDE BUSCAR UN PRODUCTO POR NOMBRE? ===');
const hayBuscadorGlobal = await pagina.evaluate(
  () => Boolean(document.querySelector('input[type="search"], input[placeholder*="usca" i], [data-buscador]'))
);
console.log(`   Buscador en la tienda: ${hayBuscadorGlobal ? 'sí' : 'NO — hay que recorrer 9 carruseles o entrar por categoría'}`);

await pagina.close();

console.log(`\n=== ERRORES DE CONSOLA: ${errores.length} ===`);
for (const e of [...new Set(errores)].slice(0, 10)) console.log(`   ${e}`);

console.log(`\nCapturas en: ${OUT}`);
await navegador.close();
