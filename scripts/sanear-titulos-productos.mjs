/**
 * Sanea los datos que el cliente ve primero en la tarjeta y en la ficha.
 *
 * Corrige cuatro cosas que llegaron así desde el catálogo del proveedor:
 *   1. Títulos escritos íntegramente en mayúsculas.
 *   2. `model` idéntico al título, que la tarjeta repite en un recuadro.
 *   3. `model` que es solo un código interno numérico, sin significado para el cliente.
 *   4. Equipos clasificados en una categoría que no les corresponde.
 *
 * Los códigos de modelo (HMS-800-2T, SUN2000-36KTL-M3) se preservan tal cual: solo se
 * capitalizan las palabras del idioma.
 *
 * Uso:  node scripts/sanear-titulos-productos.mjs --dry-run
 *       node scripts/sanear-titulos-productos.mjs --aplicar
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const APLICAR = process.argv.includes('--aplicar');

/** Palabras que van en minúscula salvo que abran el título. */
const CONECTORES = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'o', 'u', 'a', 'en',
  'con', 'sin', 'para', 'por', 'al', 'un', 'una',
]);

/** Siglas del sector que deben quedar en mayúscula aunque sean solo letras. */
const SIGLAS = new Set([
  'AC', 'DC', 'PV', 'MPPT', 'PWM', 'USB', 'LAN', 'WIFI', 'GPRS', 'RS485', 'CAN',
  'IP', 'LED', 'UPS', 'BMS', 'EPM', 'CT', 'CTS', 'SPD', 'DPS', 'AFCI', 'RCD',
  'KW', 'KWH', 'VDC', 'VAC', 'XLPE', 'PVC', 'CU', 'ESS', 'EV', 'ECU', 'DTU',
  'TL', 'HV', 'LV', 'MC4', 'IGBT', 'GEL', 'AGM', 'SR', 'NEMA', 'RETIE',
  'APS', 'ABB', 'BYD', 'SMA', 'GPS', 'SIM', 'PC', 'TV', 'ONU', 'IEC', 'UL',
]);

/**
 * Unidades de medida. Cuando siguen a un número no son palabras: "600 A" son amperios,
 * no el conector "a".
 */
const UNIDADES = new Map(
  Object.entries({
    a: 'A', v: 'V', w: 'W', ah: 'Ah', wh: 'Wh', kw: 'kW', kwh: 'kWh', mw: 'MW',
    va: 'VA', kva: 'kVA', ma: 'mA', wp: 'Wp', kwp: 'kWp', vdc: 'Vdc', vac: 'Vac',
    hz: 'Hz', mm: 'mm', cm: 'cm', m: 'm', kg: 'kg', g: 'g', pa: 'Pa',
  })
);

/** Un token es un código si mezcla letras con dígitos, o si trae guiones o barras. */
function esCodigo(token) {
  const limpio = token.replace(/[.,;:()]/g, '');
  if (!limpio) return false;
  const tieneDigito = /\d/.test(limpio);
  const tieneLetra = /[A-Za-z]/.test(limpio);
  if (tieneDigito && tieneLetra) return true;
  if (/[-/]/.test(limpio) && tieneDigito) return true;
  if (/^\d+$/.test(limpio)) return true;
  return false;
}

function capitalizarPalabra(token, esPrimera, tokenAnterior) {
  if (esCodigo(token)) return token;

  const soloLetras = token.replace(/[^A-Za-zÁÉÍÓÚÑÜ]/gi, '');
  if (SIGLAS.has(soloLetras.toUpperCase())) {
    return token.replace(soloLetras, soloLetras.toUpperCase());
  }

  // Unidad de medida detrás de un número: "600 A", "48 V", "5 kWh".
  if (/^\d+([.,]\d+)?$/.test(tokenAnterior ?? '')) {
    const unidad = UNIDADES.get(soloLetras.toLowerCase());
    if (unidad) return token.replace(soloLetras, unidad);
  }

  // Compuestos con guion: cada segmento se resuelve por separado, y los de hasta tres
  // letras se dejan en mayúscula porque casi siempre son siglas ("ECU-C", "S-Miles").
  if (token.includes('-') && /[A-Za-z]/.test(token)) {
    return token
      .split('-')
      .map((parte) => {
        const letrasParte = parte.replace(/[^A-Za-zÁÉÍÓÚÑÜ]/gi, '');
        if (letrasParte.length > 0 && letrasParte.length <= 3) return parte.toUpperCase();
        return parte.toLowerCase().replace(/^(\p{L})/u, (c) => c.toUpperCase());
      })
      .join('-');
  }

  const minuscula = token.toLowerCase();
  if (!esPrimera && CONECTORES.has(minuscula)) return minuscula;

  return minuscula.replace(/^(\p{L})/u, (c) => c.toUpperCase());
}

export function capitalizarTitulo(texto) {
  const partes = texto.split(/(\s+)/);
  let anterior = '';

  return partes
    .map((parte, i) => {
      if (/^\s+$/.test(parte)) return parte;
      const resultado = capitalizarPalabra(parte, i === 0, anterior);
      anterior = parte;
      return resultado;
    })
    .join('');
}

const letras = (t) => t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
const estaEnMayusculas = (t) => {
  const l = letras(t);
  return l.length > 6 && l === l.toUpperCase();
};

/**
 * Reclasificaciones puntuales, verificadas una por una. No es una regla automática:
 * "microinversor" en el título de un datalogger no lo convierte en inversor.
 */
const RECLASIFICAR = new Map([
  ['HOYMILES MICROINVERTER HMS-800-2T', 'inversores'],
  ['HOYMILES MICROINVERTER HMS-2000-4T', 'inversores'],
  ['HOYMILES MICROINVERTER TRIFASICO HMT-2000-4T-208', 'inversores'],
  ['SOLIS MONITOREO S2-WL-ST (USB)', 'monitoreo'],
  ['SOLIS MONITOREO S3-LAN-ST', 'monitoreo'],
  ['SOLIS MONITOREO S3-WIFI-ST', 'monitoreo'],
  ['STUDER BATTERY STATUS PROCESSOR WITH 500 A SHUNT AND 5 M CABLE', 'monitoreo'],
]);

const cambios = { titulos: 0, modeloRedundante: 0, modeloNumerico: 0, categorias: 0 };
const ejemplos = [];

for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  const ruta = path.join(DIR, archivo);
  let contenido = fs.readFileSync(ruta, 'utf8');
  const original = contenido;

  const leer = (clave) =>
    (contenido.match(new RegExp(`^${clave}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';

  const titulo = leer('title');
  const modelo = leer('model');

  // 1. Título en mayúsculas
  if (titulo && estaEnMayusculas(titulo)) {
    const nuevo = capitalizarTitulo(titulo);
    if (nuevo !== titulo) {
      contenido = contenido.replace(/^title:.*$/m, `title: "${nuevo.replace(/"/g, "'")}"`);
      cambios.titulos++;
      if (ejemplos.length < 10) ejemplos.push(`  "${titulo.slice(0, 52)}"\n   -> "${nuevo.slice(0, 52)}"`);
    }
  }

  // 2 y 3. Modelo que no aporta nada al cliente
  const tituloActual = leer('title');
  if (modelo) {
    const redundante = modelo.trim().toLowerCase() === tituloActual.trim().toLowerCase();
    const soloNumeros = /^\d{4,}$/.test(modelo.trim());
    if (redundante || soloNumeros) {
      contenido = contenido.replace(/^model:.*\r?\n/m, '');
      if (redundante) cambios.modeloRedundante++;
      else cambios.modeloNumerico++;
    }
  }

  // 4. Categoría
  const nuevaCategoria = RECLASIFICAR.get(titulo);
  if (nuevaCategoria) {
    contenido = contenido.replace(/^category:.*$/m, `category: "${nuevaCategoria}"`);
    cambios.categorias++;
  }

  if (contenido !== original && APLICAR) fs.writeFileSync(ruta, contenido, 'utf8');
}

console.log(APLICAR ? '=== CAMBIOS APLICADOS ===' : '=== SIMULACION (--dry-run) ===');
console.log(`  Títulos pasados de MAYÚSCULAS a capitalización normal: ${cambios.titulos}`);
console.log(`  Campos 'model' eliminados por repetir el título:        ${cambios.modeloRedundante}`);
console.log(`  Campos 'model' eliminados por ser un código interno:    ${cambios.modeloNumerico}`);
console.log(`  Productos reclasificados de categoría:                  ${cambios.categorias}`);

if (ejemplos.length > 0) {
  console.log('\n  Ejemplos de títulos corregidos:');
  console.log(ejemplos.join('\n'));
}

if (!APLICAR) console.log('\n  Volvé a correr con --aplicar para escribir los cambios.');
