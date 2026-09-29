import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const productos = [];

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const fm = fs.readFileSync(path.join(DIR, f), 'utf8').split('---')[1] || '';
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  productos.push({ archivo: f, title: get('title'), model: get('model'), cat: get('category'), brand: get('brand') });
}

const letras = (t) => t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
const esMayusculas = (t) => {
  const l = letras(t);
  return l.length > 6 && l === l.toUpperCase();
};

const mayus = productos.filter((p) => esMayusculas(p.title));
console.log(`=== TITULOS EN MAYUSCULAS: ${mayus.length} ===`);
for (const p of mayus.slice(0, 12)) console.log(`   ${p.title.slice(0, 76)}`);
if (mayus.length > 12) console.log(`   ... y ${mayus.length - 12} más`);

const modelIgualTitulo = productos.filter(
  (p) => p.model && p.title && p.model.trim().toLowerCase() === p.title.trim().toLowerCase()
);
console.log(`\n=== model IDENTICO AL TITULO: ${modelIgualTitulo.length} ===`);
for (const p of modelIgualTitulo.slice(0, 8)) console.log(`   ${p.title.slice(0, 76)}`);
if (modelIgualTitulo.length > 8) console.log(`   ... y ${modelIgualTitulo.length - 8} más`);

const modelNumerico = productos.filter((p) => p.model && /^\d{4,}$/.test(p.model.trim()));
console.log(`\n=== model ES SOLO UN CODIGO NUMERICO: ${modelNumerico.length} ===`);
console.log('   (la tarjeta los muestra como identificador principal del producto)');
for (const p of modelNumerico.slice(0, 6)) console.log(`   model=${p.model}  <-  ${p.title.slice(0, 58)}`);

console.log(`\n=== CLASIFICACION SOSPECHOSA ===`);
const reglas = [
  [/microinver/i, 'inversores'],
  [/\bpanel solar\b/i, 'paneles'],
  [/\bbater[ií]a\b/i, 'baterias'],
  [/\bcontrolador de carga\b/i, 'controladores'],
  [/\b(datalogger|dongle|medidor|monitoreo|pantalla|shunt)\b/i, 'monitoreo'],
  [/\b(breaker|fusible|dps|supresor)\b/i, 'protecciones'],
];
let sospechosos = 0;
for (const p of productos) {
  for (const [re, esperada] of reglas) {
    if (re.test(p.title) && p.cat !== esperada) {
      console.log(`   ${p.cat.padEnd(13)} -> ${esperada.padEnd(13)} ${p.title.slice(0, 54)}`);
      sospechosos++;
      break;
    }
  }
}
console.log(`   total: ${sospechosos}`);
