import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(root, 'src', 'config', 'fichas-tecnicas.json'), 'utf8'));

const norm = (t) => String(t ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const DIR = path.join(root, 'src', 'content', 'productos');
const productos = [];
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const fm = fs.readFileSync(path.join(DIR, f), 'utf8').split('---')[1] || '';
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  if (/^draft:\s*true/m.test(fm)) continue;
  productos.push({ title: get('title'), model: get('model'), brand: get('brand'), cat: get('category') });
}

console.log(`=== COBERTURA DE HOJA DE DATOS DEL FABRICANTE (${productos.length} productos) ===\n`);
const porSerie = new Map();
let sinSerie = 0;

for (const p of productos) {
  const texto = norm(`${p.title} ${p.model}`);
  const serie = config.series.find(
    (s) => (!p.brand || s.marca === p.brand) && s.patrones.some((pt) => texto.includes(norm(pt)))
  );
  if (serie) porSerie.set(serie.id, (porSerie.get(serie.id) || 0) + 1);
  else sinSerie++;
}

for (const [id, n] of [...porSerie].sort((a, b) => b[1] - a[1])) {
  const s = config.series.find((x) => x.id === id);
  console.log(`  ${String(n).padStart(4)}  ${s.nombre}`);
}
const conSerie = productos.length - sinSerie;
console.log(`  ${String(sinSerie).padStart(4)}  (sin serie reconocida: muestran solo datos del catálogo)`);
console.log(`\n  Con hoja de datos del fabricante: ${conSerie}/${productos.length} (${Math.round((conSerie / productos.length) * 100)}%)`);

console.log('\n=== FICHAS DE EJEMPLO ===');
const ejemplos = [
  ['jinko-tiger-neo-585w', 'panel con serie Jinko'],
  ['bateria-litio-5kwh', 'batería Pylontech US5000'],
  ['bomba-solar-1100w-kolos3-123-110-20', 'bomba sin serie reconocida'],
];

for (const [slug, etiqueta] of ejemplos) {
  const ruta = path.join(dist, 'tienda', slug, 'index.html');
  if (!fs.existsSync(ruta)) {
    console.log(`\n  ${slug}: NO EXISTE`);
    continue;
  }
  const html = fs.readFileSync(ruta, 'utf8');
  console.log(`\n  ## ${etiqueta}  (${slug})`);
  const filas = (html.match(/<th scope="row"/g) || []).length;
  const grupos = [...html.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]);
  console.log(`     filas técnicas: ${filas}`);
  console.log(`     grupos: ${grupos.join(' | ')}`);
  console.log(`     hoja de datos enlazada: ${/specs-fuente"/.test(html) ? 'sí' : /specs-fuente-solicitud/.test(html) ? 'no (ofrece pedirla)' : 'FALTA'}`);
  console.log(`     garantía: ${/Garantía del fabricante/.test(html) ? 'sí' : 'FALTA'}`);
  console.log(`     normativa: ${/Normativa aplicable/.test(html) ? 'sí' : 'FALTA'}`);
  console.log(`     servicios: ${(html.match(/class="confianza-item"/g) || []).length} bloques`);
  console.log(`     FAQ: ${(html.match(/class="faq-item"/g) || []).length} preguntas`);
  console.log(`     FAQPage JSON-LD: ${/"@type":"FAQPage"/.test(html) ? 'sí' : 'FALTA'}`);
  console.log(`     precio por unidad: ${/ficha-precio-unitario/.test(html) ? 'sí' : 'no aplica'}`);
  console.log(`     peso: ${Math.round(fs.statSync(ruta).size / 1024)} KB`);
}

console.log('\n=== SITEMAP ===');
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
console.log(`  URLs: ${(sitemap.match(/<loc>/g) || []).length}`);
console.log(`  /tienda/descuentos: ${sitemap.includes('/tienda/descuentos') ? 'OK' : 'FALTA'}`);
