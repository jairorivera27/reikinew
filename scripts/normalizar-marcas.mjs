/**
 * Unifica el campo `brand` de las fichas según src/config/marcas.json.
 *
 * - Colapsa variantes de escritura ("Victron Energy" -> "Victron").
 * - Borra el campo cuando el valor es el nombre del producto y no una marca.
 *
 * Uso:
 *   node scripts/normalizar-marcas.mjs --dry-run
 *   node scripts/normalizar-marcas.mjs --aplicar
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'src', 'content', 'productos');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'config', 'marcas.json'), 'utf8'));

const aplicar = process.argv.includes('--aplicar');
if (!aplicar && !process.argv.includes('--dry-run')) {
  console.error('Indicá --dry-run o --aplicar.');
  process.exit(1);
}

const NO_ES_MARCA = CONFIG.patronesNoEsMarca.map((p) => new RegExp(p, 'i'));

/** variante normalizada -> nombre canónico */
const canonicaPorVariante = new Map();
for (const [canonica, info] of Object.entries(CONFIG.marcas)) {
  canonicaPorVariante.set(normalizar(canonica), canonica);
  for (const v of info.variantes) canonicaPorVariante.set(normalizar(v), canonica);
}

function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function esNombreDeProducto(valor) {
  const v = String(valor ?? '').trim();
  if (v.split(/\s+/).length > 3) return true;
  return NO_ES_MARCA.some((re) => re.test(v));
}

const cambios = [];
const borrados = [];
const sinReconocer = new Map();

for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  const ruta = path.join(DIR, archivo);
  const contenido = fs.readFileSync(ruta, 'utf8');
  const m = contenido.match(/^(brand:\s*)"?(.*?)"?\s*$/m);
  if (!m) continue;

  const actual = m[2].trim();
  if (!actual) continue;

  const canonica = canonicaPorVariante.get(normalizar(actual));

  if (!canonica) {
    if (esNombreDeProducto(actual)) {
      const nuevo = contenido.replace(/^brand:.*\r?\n/m, '');
      borrados.push({ archivo, valor: actual });
      if (aplicar) fs.writeFileSync(ruta, nuevo, 'utf8');
      continue;
    }
    sinReconocer.set(actual, (sinReconocer.get(actual) || 0) + 1);
    continue;
  }

  if (canonica === actual) continue;

  const nuevo = contenido.replace(/^brand:.*$/m, `brand: "${canonica}"`);
  cambios.push({ archivo, de: actual, a: canonica });
  if (aplicar) fs.writeFileSync(ruta, nuevo, 'utf8');
}

const modo = aplicar ? 'APLICAR' : 'SIMULACIÓN';
console.log(`\n=== Normalización de marcas · ${modo} ===\n`);

const porCambio = {};
for (const c of cambios) {
  const k = `${c.de} → ${c.a}`;
  porCambio[k] = (porCambio[k] || 0) + 1;
}
console.log(`Marcas unificadas: ${cambios.length} fichas`);
for (const [k, n] of Object.entries(porCambio).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}

console.log(`\nCampo brand eliminado (era el nombre del producto): ${borrados.length} fichas`);
for (const b of borrados) console.log(`      · ${b.archivo}: "${b.valor}"`);

if (sinReconocer.size > 0) {
  console.log(`\nMarcas sin entrada en marcas.json (se dejan tal cual): ${sinReconocer.size}`);
  for (const [marca, n] of [...sinReconocer].sort((a, b) => b[1] - a[1])) {
    console.log(`      · ${marca} (${n})`);
  }
  console.log('\n  Agregalas a src/config/marcas.json para asignarles un nivel de reputación.');
}

if (!aplicar) console.log('\nPara aplicar: node scripts/normalizar-marcas.mjs --aplicar\n');
