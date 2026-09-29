/**
 * Elimina de la tienda todos los inversores Solis (draft: true).
 *
 * Uso: node scripts/eliminar-inversores-solis.mjs --dry-run
 *      node scripts/eliminar-inversores-solis.mjs --aplicar
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const APLICAR = process.argv.includes('--aplicar');

const eliminados = [];

for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  const ruta = path.join(DIR, archivo);
  let contenido = fs.readFileSync(ruta, 'utf8');
  const partes = contenido.split('---');
  if (partes.length < 3) continue;
  const fm = partes[1];
  if (/^draft:\s*true/m.test(fm)) continue;

  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  if (get('category') !== 'inversores') continue;

  const brand = get('brand');
  const title = get('title');
  const model = get('model');
  const esSolis =
    /^solis$/i.test(brand.trim()) ||
    /\bsolis\b/i.test(title) ||
    /\bsolis\b/i.test(model);

  if (!esSolis) continue;

  eliminados.push({ archivo, title, power: get('power') });

  if (!APLICAR) continue;

  if (/^draft:/m.test(fm)) {
    partes[1] = fm.replace(/^draft:.*$/m, 'draft: true');
  } else {
    partes[1] = '\n' + 'draft: true' + fm.replace(/^\n?/, '\n');
  }
  fs.writeFileSync(ruta, partes.join('---'), 'utf8');
}

console.log(APLICAR ? '=== SOLIS OCULTADOS ===' : '=== SIMULACIÓN ===');
console.log(`Total: ${eliminados.length}`);
for (const p of eliminados) console.log(`  ${(p.power || '-').padEnd(8)} ${p.title.slice(0, 72)}`);
if (!APLICAR) console.log('\nVolvé a correr con --aplicar para escribir.');
