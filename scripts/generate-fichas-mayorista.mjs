/**
 * Lee data/lista-precios-mayorista.txt (una línea o varias).
 * Formato: "DESCRIPCION numeroConComas $" repetido (último ítem puede terminar sólo en dígitos sin $).
 * Precio en ficha = ceil(precio_lista × 1.2), formato COP.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { enrichMayoristaFicha } from './lib/mayorista-product-copy.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const INPUT = path.join(ROOT, 'data', 'lista-precios-mayorista.txt');
const OUTDIR = path.join(ROOT, 'src', 'content', 'productos');

const PRICE_CHUNK = /\s+(\d{1,3}(?:,\d{3})+|\d+)\s*\$/g;

function formatCOP(n) {
  const v = Math.ceil(Number(n) * 1.2);
  return '$' + v.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function parseListPrice(raw) {
  const digits = String(raw).replace(/\./g, '').replace(/,/g, '').replace(/^0+/, '') || '0';
  const num = parseInt(digits, 10);
  return Number.isFinite(num) ? num : NaN;
}

function cleanName(t) {
  return t.replace(/\u00a0/g, ' ').replace(/\u2013/g, '-').trim();
}

/** No publicar estructuras Alurack / K2 ni tornillería de esa línea en tienda mayorista */
function skipMayoristaRow(titleRaw) {
  const t = titleRaw.trim();
  if (!t) return true;
  if (/ALURACK/i.test(t)) return true;
  if (/^K2 ESTRUCTURA\b/i.test(t)) return true;
  if (/^TORNILLO DE FIJ/i.test(t)) return true;
  if (/^CLAMP TRAPEZOIDAL/i.test(t)) return true;
  return false;
}

function guessCategory(titleRaw) {
  const t = titleRaw.trim();
  const u = t.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase();

  /** Primero líneas STUDER específicas */
  if (/^STUDER\b/i.test(t)) {
    if (/RJ45|^STUDER CABLE\b|^STUDER REMOTE|^STUDER BATTERY STATUS/i.test(t)) return 'protecciones';
    if (/\bMPPT\s+SOLAR\b|\bSOLAR\s+CHARGE\s+CONTROLLER\b|\bVT\b|\bVS\b/.test(u)) return 'controladores';
    if (/XTENDER/.test(u)) return 'inversores';
    return 'protecciones';
  }

  /** Huawei / Lunna / packs residenciales almacén */
  if (
    /SOLUNA\s+\d+\s*K\b.*\bPACK\b|^\s*LUNA2000-|^\s*PYTES\b.*LIFEPO|\b5\.12KWH\b|^\s*PYTES\s+E-BOX|^PYTES\b.*BATTERY|^BYD\s+BATTERY\s+BOX\s+PREMIUM|^PYTES\b.*48100/i.test(u)
  ) {
    if (/SOLUNA\s+WALL|SOLUNA\s+HV\s+PARALLEL|\bCONDUIT\b|^PYTES\s+COMM|^PYTES\s+USB|ALTAFOX/i.test(u)) return 'protecciones';
    return 'baterias';
  }

  /** APS / SUN2000 microinverters */
  if (/\bSUN2000-|^\s*APS\b.*MICRO|QT2-|DS3\s*-\s*LV|MICROINVERS/i.test(u)) return 'inversores';
  if (/^\s*HOYMILES\s+HMS[^\s]|^\s*HOYMILES\s+HMT/i.test(u)) return 'inversores';

  /** Solis — separar monitoreo/accesorio */
  if (/^\s*SOLIS\b/i.test(u)) {
    if (
      /\b(MONITOREO|GPRS|EPM|S2-WL|METER|WLAN|SIMCARD|DLS|EPM3|^\s*S3\b|\bS3-\b|\bCTS\b|CLAMP\b)/i.test(u)
    )
      return 'protecciones';
    return 'inversores';
  }

  /** Fronius */
  if (/^FRONIUS\b/i.test(u) || /\bINVERSOR\s+FRONIUS\b/i.test(u)) {
    if (/\b(DATAMANAGER|SENSOR|SMART METER|METER|MÓDULE|MODULE)\b/i.test(u)) return 'protecciones';
    if (/\b(INVERSOR|SYMO|PRIMO|TAURO)\b/i.test(u)) return 'inversores';
  }

  return 'protecciones';
}

function guessBrand(title) {
  const u = title.toUpperCase();
  if (/^\s*APS\b/.test(title)) return 'APsystems';
  if (/^\s*HOYMILES\b/.test(title)) return 'Hoymiles';
  if (
    /\bSUN2000-|\bSMARTLOGGER\b|SMARTGUARD|SMARTPS|^LUNA|SDONGLE|SMART DONGLE|OPTIMIZER|BACKUP BOX|HUAWEI/i.test(title)
  ) {
    return 'Huawei';
  }
  if (/^\s*SOLIS\b/i.test(title)) return 'Solis';
  if (/^\s*FRONIUS\b/i.test(title)) return 'Fronius';
  if (/^\s*STUDER\b/i.test(title)) return 'Studer';
  if (/\bK2\b|^K2 /.test(u)) return 'K2';
  if (/ALURACK|ESTRUCTURA ALURACK/.test(u)) return 'Alurack';
  if (/SOLUNA/i.test(title)) return 'Soluna';
  if (/PYTES/i.test(title)) return 'Pytes';
  if (/BYD|ALTAFOX/i.test(title)) return 'BYD';
  if (/PROCABLE/i.test(title)) return 'Procable';
  if (/TRANSFORMADOR DE CORRIENTE|ACCUE/i.test(title)) return 'Accuenergy';
  if (/CITEL|SUPRESOR DS50PV/i.test(title)) return 'Citel';
  if (/PROCABLE|MCT|MC4|MATE|TE CONNECTIVITY/i.test(title)) return 'Genérico';
  return 'Genérico';
}

function slugifyUnique(payload, used) {
  let slug =
    `cat-mayorista-${crypto.createHash('sha1').update(payload.normalize('NFKD')).digest('hex').slice(0, 12)}`;
  let candidate = slug;
  let i = 0;
  while (used.has(candidate)) {
    i += 1;
    candidate = `${slug}-${i}`;
  }
  used.add(candidate);
  return candidate;
}

function guessImage(cat, titleUpper) {
  if (/SUN2000|HUAWEI|SMARTLOGGER|SMARTGUARD|SMARTPS|^LUNA|OPTIMIZER|BACKUP|MERC-|SDONGLE|SMART DONGLE/i.test(titleUpper))
    return '/images/huawei.png';
  if (/SOLIS/i.test(titleUpper)) return '/images/livoltek.png';
  if (/\bAPS\b|APSYSTEM|QT2-|DS3D|DS3-LV|MICROINV/i.test(titleUpper))
    return '/images/Productos tienda/Inversores/Apsystems DS3D Medellín.png';
  if (/HOYMILES\b.*HMT|^\s*HOYMILES HMS/i.test(titleUpper))
    return '/images/Productos tienda/Inversores/Must Pv30-1524 Medellín.png';
  if (/FRONIUS/i.test(titleUpper)) return '/images/logo-Victron-Energy-Ecogreensolar-1.jpg';
  if (/STUDER/i.test(titleUpper)) return '/images/logo-Victron-Energy-Ecogreensolar-1.jpg';
  if (cat === 'baterias') return '/images/bateria-litio.svg';
  if (/\bK2\b|ALURACK|TORNILLO|TUERCA|ECLAMP|MRAIL|\bCTS\b|MOUNTING|ELECTRIC METER|METER\b/i.test(titleUpper))
    return '/images/Productos tienda/Inversores/LUMIANRIA SOLAR EN MEDELLIN.png';
  return '/images/astroenergy.png';
}

function extractItems(blob) {
  const raw = cleanName(blob.replace(/^\uFEFF/, '').replace(/^MARCA\s+.*?PRECIOS\s*/i, ''));
  const s = raw.replace(/\s+/g, ' ');
  const items = [];
  let lastIdx = 0;
  let m;
  PRICE_CHUNK.lastIndex = 0;
  while ((m = PRICE_CHUNK.exec(s)) !== null) {
    const name = cleanName(s.slice(lastIdx, m.index));
    const lista = parseListPrice(m[1]);
    if (name.length > 2 && Number.isFinite(lista) && lista > 0) items.push({ name, lista });
    lastIdx = PRICE_CHUNK.lastIndex;
  }
  /** Último bloque puede terminar en número sin $ (ej. … 18,908,250) */
  const tail = cleanName(s.slice(lastIdx)).trim();
  const lm = tail.match(/^([\s\S]+?)\s+(\d{1,3}(?:,\d{3})+)\s*$/);
  if (lm && lm[1].trim().length > 5) {
    const lista = parseListPrice(lm[2]);
    if (Number.isFinite(lista) && lista > 0) items.push({ name: cleanName(lm[1]), lista });
  } else if (tail.length > 20) console.warn('[aviso línea sin parsear]', tail.slice(0, 120));

  return items;
}

function yamlEscapeLine(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function main() {
  const text = fs.readFileSync(INPUT, 'utf8');
  const items = extractItems(text);
  if (items.length === 0) {
    console.error('Sin ítems. Ejecutá primero: node scripts/import-lista-mayorista-desde-jsonl.mjs');
    process.exit(1);
  }
  const toWrite = items
    .map(({ name, lista }) => ({ name: cleanName(name), lista }))
    .filter(({ name }) => name && !skipMayoristaRow(name));
  if (toWrite.length === 0) {
    console.error('Sin ítems tras filtros (p. ej. Alurack/K2 excluidos).');
    process.exit(1);
  }
  fs.mkdirSync(OUTDIR, { recursive: true });
  const usedSlugs = new Set();
  for (const f of fs.readdirSync(OUTDIR)) {
    if (f.endsWith('.md')) usedSlugs.add(f.replace(/\.md$/i, ''));
  }

  console.log(`Generando ${toWrite.length} fichas (${items.length - toWrite.length} omitidas por filtro)…`);

  /** Orden alta para ubicar estos lotes al fondo sin pelear orden actual */
  let order = 5000;

  for (const { name, lista } of toWrite) {
    const title = name;

    const cat = guessCategory(title);
    const brand = guessBrand(title);
    const slug = slugifyUnique(`${title}|${lista}`, usedSlugs);
    const listaFmt = `$${lista.toLocaleString('es-CO')}`;
    const priceStr = formatCOP(lista);
    const enr = enrichMayoristaFicha({ title, brand, category: cat });
    const specs = enr.specifications;
    const img = guessImage(cat, title.toUpperCase());
    order += 1;

    const body = enr.bodyMarkdown;

    let fmFront = '';
    fmFront += '---\n';
    fmFront += `title: ${yamlEscapeLine(title)}\n`;
    fmFront += `description: ${yamlEscapeLine(enr.description)}\n`;
    fmFront += `image: "${img}"\n`;
    fmFront += `category: "${cat}"\n`;
    fmFront += `price: "${priceStr}"\n`;
    fmFront += 'specifications:\n';
    fmFront += specs.map((ln) => `  - ${yamlEscapeLine(ln)}`).join('\n');
    fmFront += '\n';
    fmFront += `brand: "${brand.replace(/\"/g, "'")}"\n`;
    fmFront += `model: "${title.slice(0, 72).replace(/"/g, "'")}"\n`;
    fmFront += `stock: "disponible"\n`;
    fmFront += `order: ${order}\n`;
    fmFront += '---\n\n';
    fmFront += body.trimEnd();
    fmFront += '\n';

    fs.writeFileSync(path.join(OUTDIR, `${slug}.md`), fmFront, 'utf8');
  }
  console.log('Archivos generados en', OUTDIR);
}

main();
