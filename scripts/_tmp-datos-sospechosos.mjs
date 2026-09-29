import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const productos = [];

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const fm = fs.readFileSync(path.join(DIR, f), 'utf8').split('---')[1] || '';
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  productos.push({
    archivo: f,
    title: get('title'),
    cat: get('category'),
    brand: get('brand'),
    model: get('model'),
    power: get('power'),
    price: parseInt(get('price').replace(/[^0-9]/g, ''), 10) || 0,
  });
}

console.log(`Total: ${productos.length} fichas\n`);

// Modelos que claramente no identifican un equipo.
const MODELO_BASURA = /^(wifi|n\/?a|na|accesorio|monitor|generico|gen[eé]rico|varios|-+|\d+w?)$/i;
const basura = productos.filter((p) => p.model && MODELO_BASURA.test(p.model.trim()));
console.log(`=== MODELO NO IDENTIFICABLE: ${basura.length} ===`);
for (const p of basura) {
  console.log(`  model="${p.model}"  $${p.price.toLocaleString('es-CO').padStart(12)}  ${p.title.slice(0, 60)}`);
}

// Precio por watt fuera de todo rango de mercado.
function watts(p) {
  for (const t of [p.power, p.title]) {
    if (!t) continue;
    const kw = t.match(/(\d+(?:[.,]\d+)?)\s*kW(?!h)/i);
    if (kw) return parseFloat(kw[1].replace(',', '.')) * 1000;
    const w = t.match(/(\d+(?:[.,]\d+)?)\s*W(?![a-z])/i);
    if (w) return parseFloat(w[1].replace(',', '.'));
  }
  return null;
}

console.log(`\n=== PRECIO POR WATT FUERA DE MERCADO (inversores y paneles) ===`);
const rangos = { inversores: [150, 3000], paneles: [500, 4000], bombeo: [500, 8000] };
for (const p of productos) {
  const r = rangos[p.cat];
  if (!r) continue;
  const w = watts(p);
  if (!w || !p.price) continue;
  const ppw = p.price / w;
  if (ppw < r[0] || ppw > r[1] * 4) {
    console.log(
      `  ${p.cat.padEnd(11)} $${Math.round(ppw).toLocaleString('es-CO').padStart(9)}/W  ${String(w).padStart(7)}W  $${p.price.toLocaleString('es-CO').padStart(12)}  ${p.title.slice(0, 52)}`
    );
  }
}

console.log(`\n=== TITULOS CON CARACTERES RAROS ===`);
for (const p of productos) {
  if (/[$#@]{1,}\s|\s{2,}|\$\s|[A-Z]{2,}-\$/.test(p.title)) {
    console.log(`  ${p.archivo}`);
    console.log(`      "${p.title}"`);
  }
}

console.log(`\n=== PRODUCTOS REBAJADOS (para la categoria Descuentos) ===`);
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const fm = fs.readFileSync(path.join(DIR, f), 'utf8').split('---')[1] || '';
  if (!/descuentoPct:/.test(fm)) continue;
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  console.log(`  -${get('descuentoPct')}%  ${get('price').padStart(12)} (antes ${get('precioAnterior')})  ${get('title').slice(0, 46)}  [${get('category')}]`);
}
