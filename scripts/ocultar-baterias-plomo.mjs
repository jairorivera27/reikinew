/**
 * Oculta baterías de plomo-ácido / AGM / gel (solo vendemos litio).
 * Uso: node scripts/ocultar-baterias-plomo.mjs --aplicar
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const APLICAR = process.argv.includes('--aplicar');

// Evitar falsos positivos de LiFePO4 / lithium
const ES_PLOMO =
  /\b(plomo|lead[\s-]?acid|agm\b|gel\b|ácido|acido|vrla|tubular|opzs|opzv)\b/i;
const ES_LITIO = /\b(litio|lithium|lifepo4|lfp\b|li-ion|liion|nmc)\b/i;

const encontrados = [];

for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  const ruta = path.join(DIR, archivo);
  const contenido = fs.readFileSync(ruta, 'utf8');
  const partes = contenido.split('---');
  if (partes.length < 3) continue;
  let fm = partes[1];
  if (/^draft:\s*true/m.test(fm)) continue;

  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  if (get('category') !== 'baterias') continue;

  const texto = `${get('title')} ${get('description')} ${partes[2] || ''}`;
  if (ES_LITIO.test(texto) && !/\b(plomo|lead[\s-]?acid)\b/i.test(texto)) continue;
  if (!ES_PLOMO.test(texto)) continue;

  encontrados.push(get('title'));
  if (!APLICAR) continue;

  if (/^draft:/m.test(fm)) fm = fm.replace(/^draft:.*$/m, 'draft: true');
  else fm = '\n' + 'draft: true' + fm.replace(/^\n?/, '\n');
  fs.writeFileSync(ruta, `---${fm}---${partes.slice(2).join('---')}`, 'utf8');
}

console.log(APLICAR ? '=== PLOMO OCULTO ===' : '=== SIMULACIÓN ===');
console.log(`Total: ${encontrados.length}`);
for (const t of encontrados) console.log(' ', t);
if (!APLICAR) console.log('\nCorré con --aplicar para escribir.');
