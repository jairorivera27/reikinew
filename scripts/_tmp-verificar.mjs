import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const dist = path.join(import.meta.dirname, '..', 'dist');

console.log('=== PESO DE LOS ÍNDICES (comprimido, como lo sirve Vercel) ===');
for (const f of fs.readdirSync(path.join(dist, 'tienda', 'indice'))) {
  const buf = fs.readFileSync(path.join(dist, 'tienda', 'indice', f));
  const br = zlib.brotliCompressSync(buf).length;
  console.log(`  ${f.padEnd(30)} ${String(Math.round(buf.length / 1024)).padStart(4)} KB  →  ${(br / 1024).toFixed(1)} KB brotli`);
}

console.log('\n=== TOP 5 POR CALIDAD-PRECIO ===');
for (const f of ['paneles-solares', 'inversores', 'baterias-de-litio', 'controladores-de-carga']) {
  const { items, unidad, total } = JSON.parse(
    fs.readFileSync(path.join(dist, 'tienda', 'indice', `${f}.json`), 'utf8')
  );
  console.log(`\n## ${f}  (${total} productos, unidad: ${unidad})`);
  for (const p of items.slice(0, 5)) {
    const unit = p.precioPorUnidad ? `$${p.precioPorUnidad.toLocaleString('es-CO')}/${unidad}` : '—';
    console.log(
      `  ${String(p.puntaje).padStart(5)} pts | ${unit.padStart(14)} | ${String(p.magnitud ?? '—').padStart(7)} ${unidad} | ${(p.brand || 'sin marca').padEnd(12)} | ${p.title.slice(0, 48)}`
    );
  }
  console.log('  --- los 2 peores ---');
  for (const p of items.slice(-2)) {
    const unit = p.precioPorUnidad ? `$${p.precioPorUnidad.toLocaleString('es-CO')}/${unidad}` : '—';
    console.log(
      `  ${String(p.puntaje).padStart(5)} pts | ${unit.padStart(14)} | ${String(p.magnitud ?? '—').padStart(7)} ${unidad} | ${(p.brand || 'sin marca').padEnd(12)} | ${p.title.slice(0, 48)}`
    );
  }
}

console.log('\n=== COBERTURA DE LA MÉTRICA ===');
for (const f of fs.readdirSync(path.join(dist, 'tienda', 'indice'))) {
  const { items, total } = JSON.parse(fs.readFileSync(path.join(dist, 'tienda', 'indice', f), 'utf8'));
  const con = items.filter((i) => i.precioPorUnidad !== null).length;
  const pct = Math.round((con / total) * 100);
  console.log(`  ${f.replace('.json', '').padEnd(30)} ${String(con).padStart(3)}/${String(total).padStart(3)} (${pct}%) con precio por unidad`);
}

console.log('\n=== HTML DE CATEGORÍA ===');
const html = fs.readFileSync(path.join(dist, 'tienda', 'categoria', 'paneles-solares', 'index.html'), 'utf8');
for (const [etiqueta, patron] of [
  ['barra de filtros', /data-filtros/],
  ['checkbox de marca', /data-filtro-marca/],
  ['rango de precio', /data-filtro-precio-min/],
  ['rango de potencia', /data-filtro-potencia-min/],
  ['select de orden', /data-filtro-orden/],
  ['badge calidad-precio', /producto-badge-valor/],
  ['precio por unidad', /producto-precio-unitario/],
  ['ruta del índice', /tienda\/indice\/paneles-solares\.json/],
]) {
  console.log(`  ${patron.test(html) ? 'OK  ' : 'FALTA'} ${etiqueta}`);
}

const tienda = fs.readFileSync(path.join(dist, 'tienda', 'index.html'), 'utf8');
const badges = (tienda.match(/producto-badge-valor/g) || []).length;
console.log(`\n  /tienda: ${badges} badges "Mejor calidad-precio" en los carruseles`);
console.log(`  /tienda: ${Math.round(fs.statSync(path.join(dist, 'tienda', 'index.html')).size / 1024)} KB → ${(zlib.brotliCompressSync(Buffer.from(tienda)).length / 1024).toFixed(1)} KB brotli`);
