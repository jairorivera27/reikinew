/**
 * Exporta el catálogo de la tienda listo para Marketplace Addi.
 *
 * Genera:
 *   data/addi-marketplace-catalogo.xlsx  (hojas: Productos, SpecsObligatorias, Resumen)
 *   data/addi-marketplace-catalogo.csv   (solo productos listos / piloto)
 *
 * Uso:
 *   node scripts/export-addi-marketplace.mjs
 *   node scripts/export-addi-marketplace.mjs --all          # incluye no listos
 *   node scripts/export-addi-marketplace.mjs --pilot=30     # top N por categoría prioritaria
 *   node scripts/export-addi-marketplace.mjs --out=ruta.xlsx
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRODUCTOS_DIR = path.join(ROOT, 'src', 'content', 'productos');
const CATEGORIAS_JSON = path.join(ROOT, 'src', 'config', 'categorias-tienda.json');
const SPECS_JSON = path.join(ROOT, 'data', 'addi-marketplace-specs.json');
const SITE = 'https://reikisolar.com.co';

const MIN_PRICE_COP = 5000;
const PRIORITY_CATS = ['paneles', 'inversores', 'baterias', 'controladores', 'protecciones', 'bombeo'];

const args = process.argv.slice(2);
const includeAll = args.includes('--all');
const pilotArg = args.find((a) => a.startsWith('--pilot='));
const PILOT_N = pilotArg ? Number(pilotArg.split('=')[1]) : null;
const outArg = args.find((a) => a.startsWith('--out='));
const OUT_XLSX = outArg
  ? path.resolve(outArg.split('=')[1])
  : path.join(ROOT, 'data', 'addi-marketplace-catalogo.xlsx');
const OUT_CSV = OUT_XLSX.replace(/\.xlsx$/i, '.csv');

function unquoteYamlString(v) {
  const t = String(v || '').trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return t;
}

function parseProductMd(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const data = { specifications: [] };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^specifications:\s*$/.test(line)) {
      i += 1;
      while (i < lines.length && /^\s*-\s/.test(lines[i])) {
        const mm = lines[i].match(/^\s*-\s*(.+)$/);
        if (mm) data.specifications.push(unquoteYamlString(mm[1]));
        i += 1;
      }
      continue;
    }
    if (/^seoKeywords:\s*$/.test(line)) {
      i += 1;
      while (i < lines.length && /^\s*-\s/.test(lines[i])) i += 1;
      continue;
    }
    const km = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (km && km[1] !== 'specifications' && km[1] !== 'seoKeywords') {
      data[km[1]] = unquoteYamlString(km[2]);
    }
    i += 1;
  }
  return data;
}

function priceDigits(price) {
  return String(price ?? '').replace(/[^\d]/g, '');
}

function absUrl(p) {
  const s = String(p || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `${SITE}${s.startsWith('/') ? s : `/${s}`}`;
}

function isWeakImage(imagePath) {
  if (!imagePath) return true;
  const p = String(imagePath).toLowerCase();
  if (p.includes('/placeholders/')) return true;
  if (p.endsWith('.svg')) return true;
  if (/^\/images\/[^/]+\.(png|jpe?g|webp)$/i.test(p) && !p.includes('/productos-tienda/')) return true;
  return false;
}

function loadCategoryNames() {
  try {
    const raw = JSON.parse(fs.readFileSync(CATEGORIAS_JSON, 'utf8'));
    /** @type {Record<string, string>} */
    const map = {};
    for (const c of raw.categorias || []) map[c.id] = c.nombre || c.id;
    return map;
  } catch {
    return {};
  }
}

function loadSpecs() {
  return JSON.parse(fs.readFileSync(SPECS_JSON, 'utf8'));
}

function assertSpecLimits(specs) {
  const checks = [
    ['garantia', specs.limites.garantia],
    ['devoluciones', specs.limites.devoluciones],
    ['terminos', specs.limites.terminos],
  ];
  for (const [key, max] of checks) {
    const len = String(specs[key] || '').length;
    if (len > max) {
      throw new Error(`Spec "${key}" tiene ${len} chars (máx ${max}). Acórtala en data/addi-marketplace-specs.json`);
    }
  }
}

function evaluate(data, slug) {
  /** @type {string[]} */
  const blockers = [];
  const digits = priceDigits(data.price);
  const price = digits ? Number(digits) : 0;
  const brand = String(data.brand || '').trim();
  const image = String(data.image || '').trim();
  const title = String(data.title || '').trim();

  if (!title) blockers.push('sin título');
  if (!digits) blockers.push('sin precio');
  else if (price < MIN_PRICE_COP) blockers.push(`precio < ${MIN_PRICE_COP}`);
  if (!image) blockers.push('sin imagen');
  else if (isWeakImage(image) || data.imagenPendiente === true || data.imagenPendiente === 'true') {
    blockers.push('imagen débil/pendiente');
  }
  if (data.draft === true || data.draft === 'true') blockers.push('draft');
  if (!brand || /^sin\s*marca$/i.test(brand)) blockers.push('sin marca');
  if (String(data.stock || '').toLowerCase() === 'agotado') blockers.push('agotado');

  return { blockers, price, listo: blockers.length === 0 };
}

function main() {
  const specs = loadSpecs();
  assertSpecLimits(specs);
  const categoryNames = loadCategoryNames();
  const files = fs.readdirSync(PRODUCTOS_DIR).filter((f) => f.endsWith('.md'));

  /** @type {object[]} */
  const rows = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/i, '');
    const raw = fs.readFileSync(path.join(PRODUCTOS_DIR, file), 'utf8');
    const data = parseProductMd(raw);
    if (!data) continue;

    const { blockers, price, listo } = evaluate(data, slug);
    const category = String(data.category || '').trim();
    const specsText = Array.isArray(data.specifications) ? data.specifications.join(' | ') : '';

    rows.push({
      sku: String(data.sku || slug).trim(),
      nombre: String(data.title || '').trim(),
      descripcion: String(data.description || data.title || '').trim().slice(0, 2000),
      marca: String(data.brand || '').trim(),
      modelo: String(data.model || '').trim(),
      categoria_id: category,
      categoria: categoryNames[category] || category,
      precio_cop: price || '',
      precio_texto: String(data.price || '').trim(),
      stock: String(data.stock || 'disponible').trim(),
      imagen_url: absUrl(data.image),
      link_tienda: `${SITE}/tienda/${slug}`,
      especificaciones: specsText.slice(0, 1500),
      potencia: String(data.power || '').trim(),
      slug,
      listo_addi: listo ? 'SI' : 'NO',
      motivos_bloqueo: blockers.join('; '),
      // Specs obligatorias Addi (mismas en todos; se asignan en portal)
      addi_vendedor: specs.vendedor,
      addi_garantia: specs.garantia,
      addi_devoluciones: specs.devoluciones,
      addi_terminos: specs.terminos,
      piloto_sugerido: 'NO',
    });
  }

  // Priorizar piloto: listos + categorías prioritarias, orden por precio desc
  const listos = rows.filter((r) => r.listo_addi === 'SI');
  const priority = listos
    .filter((r) => PRIORITY_CATS.includes(r.categoria_id))
    .sort((a, b) => Number(b.precio_cop) - Number(a.precio_cop));
  const rest = listos
    .filter((r) => !PRIORITY_CATS.includes(r.categoria_id))
    .sort((a, b) => Number(b.precio_cop) - Number(a.precio_cop));
  const orderedListos = [...priority, ...rest];

  const pilotLimit = Number.isFinite(PILOT_N) && PILOT_N > 0 ? PILOT_N : 20;
  for (let i = 0; i < Math.min(pilotLimit, orderedListos.length); i += 1) {
    orderedListos[i].piloto_sugerido = 'SI';
  }

  const exportRows = includeAll ? rows : listos;
  exportRows.sort((a, b) => {
    if (a.piloto_sugerido !== b.piloto_sugerido) return a.piloto_sugerido === 'SI' ? -1 : 1;
    return String(a.categoria).localeCompare(String(b.categoria)) || Number(b.precio_cop) - Number(a.precio_cop);
  });

  const productSheet = exportRows.map((r) => ({
    SKU: r.sku,
    Nombre: r.nombre,
    Descripcion: r.descripcion,
    Marca: r.marca,
    Modelo: r.modelo,
    Categoria: r.categoria,
    Precio_COP: r.precio_cop,
    Stock: r.stock,
    Imagen_URL: r.imagen_url,
    Link_tienda: r.link_tienda,
    Especificaciones: r.especificaciones,
    Potencia: r.potencia,
    Slug: r.slug,
    Listo_Addi: r.listo_addi,
    Motivos_bloqueo: r.motivos_bloqueo,
    Piloto_sugerido: r.piloto_sugerido,
    Addi_Vendedor: r.addi_vendedor,
    Addi_Garantia: r.addi_garantia,
    Addi_Devoluciones: r.addi_devoluciones,
    Addi_Terminos: r.addi_terminos,
  }));

  const specsSheet = [
    { Campo: 'Vendedor', Texto: specs.vendedor, Max_chars: '—', Actual: specs.vendedor.length },
    { Campo: 'Garantía', Texto: specs.garantia, Max_chars: specs.limites.garantia, Actual: specs.garantia.length },
    {
      Campo: 'Devoluciones',
      Texto: specs.devoluciones,
      Max_chars: specs.limites.devoluciones,
      Actual: specs.devoluciones.length,
    },
    { Campo: 'Términos', Texto: specs.terminos, Max_chars: specs.limites.terminos, Actual: specs.terminos.length },
  ];

  const byCat = {};
  for (const r of rows) {
    const k = r.categoria || r.categoria_id || 'sin';
    if (!byCat[k]) byCat[k] = { total: 0, listos: 0, bloqueados: 0 };
    byCat[k].total += 1;
    if (r.listo_addi === 'SI') byCat[k].listos += 1;
    else byCat[k].bloqueados += 1;
  }

  const resumenSheet = [
    { Metrica: 'Total productos', Valor: rows.length },
    { Metrica: 'Listos para Addi', Valor: listos.length },
    { Metrica: 'Bloqueados', Valor: rows.length - listos.length },
    { Metrica: 'Piloto sugerido (N)', Valor: Math.min(pilotLimit, orderedListos.length) },
    { Metrica: 'Precio mínimo Addi', Valor: MIN_PRICE_COP },
    { Metrica: 'Exportados en esta corrida', Valor: exportRows.length },
    ...Object.entries(byCat)
      .sort((a, b) => b[1].listos - a[1].listos)
      .map(([cat, v]) => ({
        Metrica: `Cat: ${cat}`,
        Valor: `${v.listos} listos / ${v.total} total`,
      })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productSheet), 'Productos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(specsSheet), 'SpecsObligatorias');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenSheet), 'Resumen');

  fs.mkdirSync(path.dirname(OUT_XLSX), { recursive: true });
  XLSX.writeFile(wb, OUT_XLSX);

  // CSV solo de listos (o de lo exportado)
  const csvSheet = XLSX.utils.json_to_sheet(productSheet);
  const csv = XLSX.utils.sheet_to_csv(csvSheet);
  fs.writeFileSync(OUT_CSV, csv, 'utf8');

  console.log('Addi Marketplace export');
  console.log('  Total:', rows.length);
  console.log('  Listos:', listos.length);
  console.log('  Bloqueados:', rows.length - listos.length);
  console.log('  Piloto SI:', Math.min(pilotLimit, orderedListos.length));
  console.log('  XLSX:', OUT_XLSX);
  console.log('  CSV:', OUT_CSV);
  if (!includeAll) console.log('  (usa --all para incluir bloqueados)');
}

main();
