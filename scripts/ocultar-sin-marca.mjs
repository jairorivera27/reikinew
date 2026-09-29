/**
 * Saca de la tienda los productos sin marca real (brand vacío, "Sin marca",
 * "Multimarca" o "Genérico"). Los marca como draft para no destruir el archivo.
 *
 * Uso:  node scripts/ocultar-sin-marca.mjs --dry-run
 *       node scripts/ocultar-sin-marca.mjs --aplicar
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const APLICAR = process.argv.includes('--aplicar');

function esSinMarca(brand) {
  if (!brand) return true;
  return /^(sin marca|multimarca|gen[eé]rico)$/i.test(brand.trim());
}

const afectados = [];

for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  const ruta = path.join(DIR, archivo);
  let contenido = fs.readFileSync(ruta, 'utf8');
  const partes = contenido.split('---');
  if (partes.length < 3) continue;
  const fm = partes[1];

  if (/^draft:\s*true/m.test(fm)) continue;

  const brand = (fm.match(/^brand:\s*"?(.*?)"?\s*$/m) || [])[1] || '';
  if (!esSinMarca(brand)) continue;

  const title = (fm.match(/^title:\s*"?(.*?)"?\s*$/m) || [])[1] || archivo;
  const category = (fm.match(/^category:\s*"?(.*?)"?\s*$/m) || [])[1] || '';
  afectados.push({ archivo, brand: brand || '(vacío)', category, title });

  if (!APLICAR) continue;

  // Inserta draft: true justo después del frontmatter abierto, sin duplicar.
  if (/^draft:/m.test(fm)) {
    partes[1] = fm.replace(/^draft:.*$/m, 'draft: true');
  } else {
    partes[1] = '\n' + 'draft: true' + fm.replace(/^\n?/, '\n');
  }
  fs.writeFileSync(ruta, partes.join('---'), 'utf8');
}

const porCat = {};
for (const p of afectados) porCat[p.category] = (porCat[p.category] || 0) + 1;

console.log(APLICAR ? '=== PRODUCTOS OCULTADOS (draft: true) ===' : '=== SIMULACIÓN (--dry-run) ===');
console.log(`Total: ${afectados.length}`);
console.log('Por categoría:', porCat);
console.log('\nEjemplos:');
for (const p of afectados.slice(0, 12)) {
  console.log(`  [${p.category}] ${p.title.slice(0, 64)}`);
}
if (afectados.length > 12) console.log(`  ... y ${afectados.length - 12} más`);
if (!APLICAR) console.log('\nVolvé a correr con --aplicar para escribir los cambios.');
