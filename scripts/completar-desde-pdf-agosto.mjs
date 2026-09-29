/**
 * Completa fichas incompletas usando la lista técnica de agosto 2026.
 * OMITIMOS todos los precios del documento: solo código + descripción.
 *
 * Uso: node scripts/completar-desde-pdf-agosto.mjs --dry-run
 *      node scripts/completar-desde-pdf-agosto.mjs --aplicar
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'src', 'content', 'productos');
const PDF_TXT = path.join(ROOT, 'data', '_tmp-agosto-2026.txt');
const APLICAR = process.argv.includes('--aplicar');

/** Parsea el PDF ya extraído a texto: código → descripción (sin precios). */
function catalogoDesdePdf(texto) {
  const mapa = new Map();
  for (const linea of texto.split(/\r?\n/)) {
    const sinPrecio = linea
      .replace(/\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*USD/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!sinPrecio) continue;

    // Códigos Victron: 3 letras + 9 dígitos (PIN121800500). No consumir la descripción.
    const m = sinPrecio.match(
      /^((?:PIN|PMP|QUA|CMP|SCC)\d{9})(.+?)(?:\s*Victron Energy)?$/i
    );
    if (!m) continue;

    const codigo = m[1].toUpperCase();
    let desc = m[2]
      .replace(/\*If\s*(?:stock\s*)?0,?\s*order\s+[A-Z0-9]+\*/gi, '')
      .replace(/Victron Energy/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!desc || desc.length < 5) continue;
    if (!mapa.has(codigo)) mapa.set(codigo, desc);
  }
  return mapa;
}

/**
 * Interpreta descripciones Victron tipo:
 *   "Phoenix Inverter 12/800 120V VE.Direct"
 *   "MultiPlus-II 48/5000/70-95 120V"
 *   "Quattro 48/10000/140-100/100 120V VE.Bus"
 */
function interpretarVictron(codigo, desc) {
  const d = desc.replace(/\s+/g, ' ').trim();
  const u = d.toUpperCase();

  let familia = 'Inversor';
  let tipo = 'Híbrido'; // MultiPlus / Quattro por defecto
  if (/^PIN/i.test(codigo) || /PHOENIX|PHINV|\bINVERTER\b/.test(u) && !/MULTIPLUS|QUATTRO/.test(u)) {
    familia = /PHOENIX|PHINV/i.test(u) ? 'Phoenix' : 'Phoenix';
    tipo = 'Off-Grid'; // inversor puro, sin cargador
  }
  if (/MULTIPLUS\s*-?\s*II|MULTIPL\s*-?\s*II/.test(u)) {
    familia = 'MultiPlus-II';
    tipo = 'Híbrido';
  } else if (/MULTIPLUS|MULTIPL/.test(u)) {
    familia = 'MultiPlus';
    tipo = 'Híbrido';
  }
  if (/QUATTRO\s*-?\s*II/.test(u)) {
    familia = 'Quattro-II';
    tipo = 'Híbrido';
  } else if (/QUATTRO|QUAT\b/.test(u)) {
    familia = 'Quattro';
    tipo = 'Híbrido';
  }

  // Potencia: 12/800, 48/5000, 48/10k, 24 /2000 (a veces con espacio raro del PDF)
  let tensionBat = null;
  let potenciaVA = null;
  let corrienteCarga = null;
  let tensionAC = null;

  let m = d.match(/\b(12|24|48)\s*\/\s*(\d+(?:[.,]\d+)?)\s*k\b/i); // 48/10k
  if (m) {
    tensionBat = `${m[1]} V`;
    potenciaVA = Math.round(parseFloat(m[2].replace(',', '.')) * 1000);
  }
  if (!potenciaVA) {
    m = d.match(/(?:^|[^\d])(12|24|48)\s*\/\s*(\d{3,5})\b/);
    if (m) {
      tensionBat = `${m[1]} V`;
      potenciaVA = parseInt(m[2], 10);
    }
  }
  // Fallback: decodificar del propio código Victron PIN/PMP/QUA
  // PIN12 1800 500 → 12V / 1800VA ; PIN12 2122 500 → 12V / 1200VA (2122=1200)
  if (!potenciaVA && /^(PIN|PMP|QUA)\d{9}$/i.test(codigo)) {
    const bat = codigo.slice(3, 5); // 12, 24, 48
    const mid = codigo.slice(5, 9); // potencia codificada
    if (/^(12|24|48)$/.test(bat)) tensionBat = `${bat} V`;
    const tabla = {
      '0251': 250,
      '0375': 375,
      '0501': 500,
      '1215': 500, // MultiPlus 12/500 → PMP121500100 mid=1500? wait
    };
    // Convención real: dígitos 5-8 ≈ VA con rarezas (2122→1200, 1800→800, 2510→250, 3750→375, 3021→3000)
    const n = parseInt(mid, 10);
    const mapaEspecial = {
      2510: 250,
      3750: 375,
      5010: 500,
      1800: 800,
      2122: 1200,
      2161: 1600,
      2200: 2000,
      2301: 3000,
      2305: 3000,
      3021: 3000,
      2505: 5000,
      5021: 5000,
      5023: 5000,
      2501: 5000,
      3100: 10000,
      3150: 15000,
      1500: 500,
      2120: 1200,
    };
    if (mapaEspecial[mid]) potenciaVA = mapaEspecial[mid];
    else if (n >= 500 && n <= 15000) potenciaVA = n;
  }

  m = d.match(/\/(\d{2,3})-(\d{2,3})(?:\/(\d{2,3}))?/); // /120-50 o /70-100/100
  if (m && (familia.startsWith('Multi') || familia.startsWith('Quattro'))) {
    corrienteCarga = `${m[1]} A`;
  }

  m = d.match(/\b(120|230|240|277)V\b/i) || d.match(/\b2x120V\b/i);
  if (m) tensionAC = /2x120/i.test(d) ? '2x120 V' : `${m[1]} V`;

  const comunicacion = /VE\.Direct/i.test(d)
    ? 'VE.Direct'
    : /VE\.Bus/i.test(d)
      ? 'VE.Bus'
      : null;

  const ul = /UL\s*458|UL\s*1741|\(UL/i.test(d);
  const gfci = /GFCI/i.test(d);

  const potenciaLabel =
    potenciaVA >= 1000
      ? `${(potenciaVA / 1000).toString().replace('.', ',')} kVA`
      : potenciaVA
        ? `${potenciaVA} VA`
        : null;

  // Nombre comercial limpio
  const ratio = tensionBat && potenciaVA
    ? `${tensionBat.replace(' V', '')}/${potenciaVA >= 1000 && potenciaVA % 1000 === 0 ? potenciaVA / 1000 + '000' : potenciaVA}`.replace(
        /\/(\d)000$/,
        (_, d) => (potenciaVA >= 10000 ? `/${potenciaVA}` : `/${potenciaVA}`)
      )
    : null;

  // Preferir notación Victron clásica: 12/800, 48/5000, 48/10000
  let ratioVictron = null;
  if (tensionBat && potenciaVA) {
    ratioVictron = `${tensionBat.replace(' V', '')}/${potenciaVA}`;
  }

  const titulo = ratioVictron
    ? `Victron ${familia} ${ratioVictron}`
    : `Victron ${familia} ${codigo}`;

  const power =
    potenciaVA >= 1000
      ? `${(potenciaVA / 1000).toString().replace(/\.0$/, '')}kW`
      : potenciaVA
        ? `${potenciaVA}W`
        : undefined;

  const specs = [
    `Tipo: ${tipo === 'Off-Grid' ? 'Inversor Off-Grid (solo inversor)' : 'Inversor-cargador híbrido'}`,
    `Familia: ${familia}`,
    ratioVictron ? `Configuración: ${ratioVictron}` : null,
    tensionBat ? `Tensión de batería: ${tensionBat}` : null,
    potenciaVA ? `Potencia aparente: ${potenciaVA} VA` : null,
    corrienteCarga ? `Corriente de carga: ${corrienteCarga}` : null,
    tensionAC ? `Tensión de salida CA: ${tensionAC}` : null,
    comunicacion ? `Comunicación: ${comunicacion}` : null,
    gfci ? 'Protección: GFCI (UL 458)' : null,
    ul && !gfci ? 'Certificación: UL' : null,
    `Referencia Victron: ${codigo}`,
    'Fuente: lista técnica del fabricante / distribuidor (agosto 2026)',
  ].filter(Boolean);

  const description = [
    `${familia} Victron Energy`,
    ratioVictron ? `${ratioVictron}` : null,
    tensionAC ? `${tensionAC} CA` : null,
    tipo === 'Off-Grid'
      ? 'inversor puro para sistemas aislados'
      : 'inversor-cargador para sistemas híbridos y aislados',
    comunicacion ? `con ${comunicacion}` : null,
  ]
    .filter(Boolean)
    .join(', ') + '.';

  return {
    titulo,
    model: ratioVictron ? `${familia} ${ratioVictron}` : codigo,
    power,
    tipo,
    potenciaVA,
    specs,
    description,
    descOriginal: d,
  };
}

function leerFrontmatter(contenido) {
  const partes = contenido.split('---');
  if (partes.length < 3) return null;
  return { partes, fm: partes[1], body: partes.slice(2).join('---') };
}

function setCampo(fm, clave, valor) {
  const linea = `${clave}: "${String(valor).replace(/"/g, "'")}"`;
  if (new RegExp(`^${clave}:`, 'm').test(fm)) {
    return fm.replace(new RegExp(`^${clave}:.*$`, 'm'), linea);
  }
  // Insertar antes del cierre: después de title si existe
  if (/^title:/m.test(fm)) {
    return fm.replace(/^(title:.*)$/m, `$1\n${linea}`);
  }
  return `\n${linea}` + fm;
}

function setSpecs(fm, specs) {
  const bloque = specs.map((s) => `  - "${s.replace(/"/g, "'")}"`).join('\n');
  if (/^specifications:/m.test(fm)) {
    // Reemplaza el bloque completo de specifications
    return fm.replace(
      /^specifications:\n(?:\s*-\s*.*\n)*/m,
      `specifications:\n${bloque}\n`
    );
  }
  return fm.replace(/^(category:.*)$/m, `$1\nspecifications:\n${bloque}`);
}

const textoPdf = fs.readFileSync(PDF_TXT, 'utf8');
const catalogo = catalogoDesdePdf(textoPdf);

const cambios = [];
let sinMatch = 0;

for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  const ruta = path.join(DIR, archivo);
  const contenido = fs.readFileSync(ruta, 'utf8');
  const parsed = leerFrontmatter(contenido);
  if (!parsed) continue;
  let { fm } = parsed;
  if (/^draft:\s*true/m.test(fm)) continue;

  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  const category = get('category');
  const brand = get('brand');
  const title = get('title');
  const model = get('model');
  const sku = get('sku');

  // Solo Victron inversores por ahora (el caso que pidió el usuario)
  if (category !== 'inversores') continue;
  if (!/victron/i.test(brand + title)) continue;

  // Ya tienen nombre comercial usable (no solo el código)
  if (/phoenix|quattro|multiplus/i.test(title) && !/\b(PIN|PMP|QUA)\d{9}\b/i.test(title)) {
    continue;
  }

  const fromFile = archivo.match(/victron-(pin|pmp|qua)([a-z0-9]+)/i);
  const codigoMatch =
    (sku && /^(PIN|PMP|QUA)\d{9}$/i.test(sku) && sku.toUpperCase()) ||
    (model && /^(PIN|PMP|QUA)\d{9}$/i.test(model) && model.toUpperCase()) ||
    (title.match(/\b((?:PIN|PMP|QUA)\d{9})\b/i) || [])[1]?.toUpperCase() ||
    (fromFile ? `${fromFile[1]}${fromFile[2]}`.toUpperCase() : null);

  if (!codigoMatch || !catalogo.has(codigoMatch)) {
    if (codigoMatch) console.log(`  SIN MATCH PDF: ${codigoMatch} ← ${title}`);
    sinMatch++;
    continue;
  }

  const descPdf = catalogo.get(codigoMatch);
  const info = interpretarVictron(codigoMatch, descPdf);

  const antes = {
    title,
    power: get('power'),
    model,
  };

  fm = setCampo(fm, 'title', info.titulo);
  fm = setCampo(fm, 'model', info.model);
  fm = setCampo(fm, 'sku', codigoMatch);
  if (info.power) fm = setCampo(fm, 'power', info.power);
  fm = setCampo(fm, 'brand', 'Victron');
  fm = setCampo(fm, 'description', info.description);
  fm = setSpecs(fm, info.specs);

  // Quitar power: N/A
  fm = fm.replace(/^power:\s*"?N\/A"?\s*$/m, info.power ? `power: "${info.power}"` : '');

  const nuevoBody = `\n\n**${info.titulo}** (ref. **${codigoMatch}**). ${info.description}\n\nDatos tomados de la descripción técnica del fabricante; el precio de la tienda no se modifica con este documento.\n`;

  const nuevo = `---${fm}---${nuevoBody}`;

  cambios.push({
    archivo,
    codigo: codigoMatch,
    antes: antes.title,
    despues: info.titulo,
    power: info.power,
    tipo: info.tipo,
  });

  if (APLICAR) fs.writeFileSync(ruta, nuevo, 'utf8');
}

console.log(APLICAR ? '=== APLICADO ===' : '=== SIMULACIÓN (--dry-run) ===');
console.log(`Victron completados: ${cambios.length}`);
console.log(`Sin match en PDF: ${sinMatch}`);
console.log('');
for (const c of cambios) {
  console.log(`  [${c.tipo}] ${c.power || '?'}  ${c.antes.slice(0, 45)}`);
  console.log(`       → ${c.despues}  (${c.codigo})`);
}
if (!APLICAR) console.log('\nVolvé a correr con --aplicar para escribir.');
