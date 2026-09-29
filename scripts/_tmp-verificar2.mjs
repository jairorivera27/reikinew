import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(import.meta.dirname, '..', 'dist');

console.log('=== TOP 6 DE CADA CARRUSEL (orden por demanda del mercado) ===');
for (const f of ['paneles-solares', 'inversores', 'baterias-de-litio', 'controladores-de-carga', 'protecciones-electricas']) {
  const { items, unidad, total } = JSON.parse(
    fs.readFileSync(path.join(dist, 'tienda', 'indice', `${f}.json`), 'utf8')
  );
  console.log(`\n## ${f} (${total})`);
  for (const p of items.slice(0, 6)) {
    const mag = p.magnitud !== null ? `${p.magnitud} ${unidad}` : '—';
    console.log(
      `  ${String(p.puntaje).padStart(5)} | ${mag.padStart(11)} | ${(p.brand || 'sin marca').padEnd(12)} | ${p.destacado ? '★' : ' '} | ${p.title.slice(0, 50)}`
    );
  }
}

console.log('\n\n=== PAGINA DE DESCUENTOS ===');
const desc = fs.readFileSync(path.join(dist, 'tienda', 'descuentos', 'index.html'), 'utf8');
for (const [etiqueta, patron] of [
  ['hero de liquidación', /desc-hero/],
  ['descuento máximo', /-56%/],
  ['grilla de productos', /desc-grid/],
  ['ahorro por producto', /desc-item-ahorro/],
  ['chips por categoría', /desc-chip/],
  ['JSON-LD CollectionPage', /CollectionPage/],
  ['breadcrumbs', /BreadcrumbList/],
  ['canonical', /rel="canonical"/],
]) {
  console.log(`  ${patron.test(desc) ? 'OK   ' : 'FALTA'} ${etiqueta}`);
}
console.log(`  productos listados: ${(desc.match(/class="desc-item"/g) || []).length}`);

console.log('\n=== BOTONES DE DESCUENTOS EN /tienda ===');
const tienda = fs.readFileSync(path.join(dist, 'tienda', 'index.html'), 'utf8');
console.log(`  botón del menú lateral: ${/sidebar-descuentos/.test(tienda) ? 'OK' : 'FALTA'}`);
console.log(`  banner en el cuerpo:    ${/banner-descuentos/.test(tienda) ? 'OK' : 'FALTA'}`);
console.log(`  enlaces a /tienda/descuentos: ${(tienda.match(/\/tienda\/descuentos/g) || []).length}`);

console.log('\n=== GOODWE 75kW WIFI ELIMINADO ===');
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
console.log(`  ficha en dist:   ${fs.existsSync(path.join(dist, 'tienda', 'inversor-solar-hibrido-goodwe-75kw-wifi')) ? 'TODAVIA EXISTE' : 'eliminada'}`);
console.log(`  en el sitemap:   ${sitemap.includes('goodwe-75kw-wifi') ? 'TODAVIA APARECE' : 'no aparece'}`);
console.log(`  en el índice:    ${fs.readFileSync(path.join(dist, 'tienda', 'indice', 'inversores.json'), 'utf8').includes('75kW WIFI') ? 'TODAVIA APARECE' : 'no aparece'}`);
console.log(`  URLs en sitemap: ${(sitemap.match(/<loc>/g) || []).length}`);
console.log(`  /tienda/descuentos en sitemap: ${sitemap.includes('/tienda/descuentos') ? 'OK' : 'FALTA (hay que agregarlo)'}`);
