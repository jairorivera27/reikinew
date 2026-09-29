/**
 * Restaura reflectores y bombeo que se ocultaron por "Sin marca",
 * e intenta asignar marca desde el título (Kolos, etc.).
 *
 * Uso: node scripts/restaurar-reflectores-bombeo.mjs --aplicar
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const APLICAR = process.argv.includes('--aplicar');

function marcaDesdeTitulo(title, category) {
  const t = title.toUpperCase();
  if (category === 'bombeo') {
    if (/KOLOS|KOL\d|KOL4|KOL3/.test(t)) return 'Kolos';
    if (/\bPOOL/.test(t)) return 'Kolos';
  }
  return null;
}

let restaurados = 0;
const ejemplos = [];

for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  const ruta = path.join(DIR, archivo);
  let contenido = fs.readFileSync(ruta, 'utf8');
  const partes = contenido.split('---');
  if (partes.length < 3) continue;
  let fm = partes[1];
  if (!/^draft:\s*true/m.test(fm)) continue;

  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  const category = get('category');
  if (category !== 'reflectores' && category !== 'bombeo') continue;

  const title = get('title');
  const marcaNueva = marcaDesdeTitulo(title, category);

  fm = fm.replace(/^draft:\s*true\s*\r?\n?/m, '');
  if (marcaNueva) {
    if (/^brand:/m.test(fm)) {
      fm = fm.replace(/^brand:.*$/m, `brand: "${marcaNueva}"`);
    } else {
      fm = fm.replace(/^(category:.*)$/m, `$1\nbrand: "${marcaNueva}"`);
    }
  } else if (/^brand:\s*"?Sin marca"?/im.test(fm)) {
    fm = fm.replace(/^brand:.*\r?\n/m, '');
  }

  restaurados++;
  if (ejemplos.length < 8) ejemplos.push(`${category}: ${title} → brand=${marcaNueva || '(ninguna)'}`);

  if (APLICAR) {
    fs.writeFileSync(ruta, `---${fm}---${partes.slice(2).join('---')}`, 'utf8');
  }
}

console.log(APLICAR ? '=== RESTAURADOS ===' : '=== SIMULACIÓN ===');
console.log(`Total: ${restaurados}`);
for (const e of ejemplos) console.log(' ', e);
if (!APLICAR) console.log('\nCorré con --aplicar para escribir.');
