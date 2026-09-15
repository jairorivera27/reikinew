/**
 * Sincroniza el catálogo real de la tienda (src/content/productos) → Google Merchant Center.
 *
 * - Solo productos publicados (draft !== true)
 * - Envía imageLink absoluto (+ promoImagen como additionalImageLinks si existe)
 * - Upsert por offerId (= slug del producto)
 *
 * Uso:
 *   node scripts/google-merchant/sync-catalog.mjs           # dry-run
 *   node scripts/google-merchant/sync-catalog.mjs --insert  # inserta de verdad
 *   node scripts/google-merchant/sync-catalog.mjs --insert --limit=20
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { insertProductsBatch, buildMerchantProductResource } from './insert-product.mjs';
import { MERCHANT_ID, DATA_SOURCE_ID, SITE_URL } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PRODUCTOS_DIR = path.join(ROOT, 'src', 'content', 'productos');
const CATEGORIAS_JSON = path.join(ROOT, 'src', 'config', 'categorias-tienda.json');

const BATCH_SIZE = 40;
const BATCH_PAUSE_MS = 250;
const CONCURRENCY = 8;

/** Google Product Category por categoría interna (taxonomy IDs). */
const GOOGLE_CATEGORY_BY_INTERNAL = {
  paneles: '632', // Solar Panels
  inversores: '275', // Power Adapters & Chargers (closest common match)
  baterias: '222', // Batteries
  controladores: '275',
  protecciones: '127', // Circuit Breakers & Fuses (approx. Hardware/electrical)
  cargadores: '298', // Battery Chargers
  monitoreo: '2227', // Measuring Tools & Sensors (approx.)
  bombeo: '500096', // Water Pumps (approx.)
  reflectores: '594', // Flood Lights
  accesorios: '2082', // Electronics Accessories
};

const args = new Set(process.argv.slice(2));
const doInsert = args.has('--insert');
const limitArg = [...args].find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : null;

function unquoteYamlString(v) {
  const t = v.trim();
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
    if (km) {
      const key = km[1];
      if (key !== 'specifications' && key !== 'seoKeywords') {
        data[key] = unquoteYamlString(km[2]);
      }
    }
    i += 1;
  }
  return data;
}

function loadCategoryNames() {
  try {
    const raw = JSON.parse(fs.readFileSync(CATEGORIAS_JSON, 'utf8'));
    /** @type {Record<string, string>} */
    const map = {};
    for (const c of raw.categorias || []) {
      map[c.id] = c.nombre || c.id;
    }
    return map;
  } catch {
    return {};
  }
}

function isTruthyDraft(v) {
  return v === true || v === 'true';
}

function isWeakImage(imagePath) {
  if (!imagePath) return true;
  const p = String(imagePath).toLowerCase();
  if (p.includes('/placeholders/')) return true;
  if (p.endsWith('.svg')) return true;
  // Logos de marca en /images/*.png (sin productos-tienda)
  if (/^\/images\/[^/]+\.(png|jpe?g|webp)$/i.test(p) && !p.includes('/productos-tienda/')) {
    return true;
  }
  return false;
}

function priceDigits(price) {
  return String(price ?? '').replace(/[^\d]/g, '');
}

/** Google limita offerId a 50 caracteres. */
function toOfferId(slug, sku) {
  const s = String(sku || '').trim();
  if (s && s.length <= 50 && !/\s/.test(s)) return s;
  if (slug.length <= 50) return slug;
  // ID estable corto a partir del slug (misma entrada → mismo offerId).
  return `r${createHash('sha1').update(slug).digest('hex').slice(0, 49)}`;
}

/**
 * @param {object} data
 * @param {string} slug
 * @param {Record<string, string>} categoryNames
 */
function toMerchantInput(data, slug, categoryNames) {
  const category = String(data.category || '').trim();
  const brand = String(data.brand || '').trim();
  const image = String(data.image || '').trim();
  const promoImagen = String(data.promoImagen || '').trim();

  const digits = priceDigits(data.price);
  if (!digits) return { skip: 'sin precio válido' };
  if (!image) return { skip: 'sin imagen' };
  if (isWeakImage(image)) return { skip: `imagen débil/placeholder: ${image}` };
  if (isTruthyDraft(data.draft)) return { skip: 'draft' };
  if (brand && /^sin\s*marca$/i.test(brand)) return { skip: 'sin marca' };

  const regularDigits = priceDigits(data.precioAnterior);
  const hasSale = Boolean(regularDigits && Number(regularDigits) > Number(digits));

  /** @type {string[]} */
  const additionalImageLinks = [];
  if (promoImagen && promoImagen !== image && !isWeakImage(promoImagen)) {
    additionalImageLinks.push(promoImagen);
  }

  const description =
    String(data.seoDescription || data.description || data.title || '').trim() ||
    String(data.title);

  const mpn = String(data.model || data.sku || '').trim() || undefined;

  return {
    input: {
      offerId: toOfferId(slug, data.sku),
      title: String(data.title).trim(),
      description,
      link: `/tienda/${slug}`,
      imageLink: image,
      additionalImageLinks,
      price: hasSale ? regularDigits : digits,
      salePrice: hasSale ? digits : undefined,
      brand: brand || undefined,
      mpn,
      stock: data.stock || 'disponible',
      productType: categoryNames[category] || category || undefined,
      googleProductCategory: GOOGLE_CATEGORY_BY_INTERNAL[category],
    },
  };
}

function loadCatalog() {
  const categoryNames = loadCategoryNames();
  const files = fs.readdirSync(PRODUCTOS_DIR).filter((f) => f.endsWith('.md'));

  /** @type {import('./insert-product.mjs').MerchantProductInput[]} */
  const ready = [];
  /** @type {Array<{ slug: string, reason: string }>} */
  const skipped = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/i, '');
    const raw = fs.readFileSync(path.join(PRODUCTOS_DIR, file), 'utf8');
    const data = parseProductMd(raw);
    if (!data) {
      skipped.push({ slug, reason: 'frontmatter inválido' });
      continue;
    }
    const mapped = toMerchantInput(data, slug, categoryNames);
    if (mapped.skip) {
      skipped.push({ slug, reason: mapped.skip });
      continue;
    }
    ready.push(mapped.input);
  }

  ready.sort((a, b) => a.offerId.localeCompare(b.offerId));
  return { ready, skipped };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Merchant ID:', MERCHANT_ID);
  console.log('Data source ID:', DATA_SOURCE_ID);
  console.log('SITE_URL:', SITE_URL);
  console.log('Modo:', doInsert ? 'INSERT (Merchant API productInputs.insert)' : 'DRY-RUN');

  let { ready, skipped } = loadCatalog();
  console.log(`Publicables con imagen+precio: ${ready.length}`);
  console.log(`Omitidos: ${skipped.length}`);

  if (LIMIT && Number.isFinite(LIMIT) && LIMIT > 0) {
    ready = ready.slice(0, LIMIT);
    console.log(`--limit=${LIMIT} → sincronizando ${ready.length}`);
  }

  const byCat = {};
  for (const p of ready) {
    const k = p.productType || '(sin cat)';
    byCat[k] = (byCat[k] || 0) + 1;
  }
  console.log('Por categoría:', byCat);

  if (ready[0]) {
    console.log('\nEjemplo payload (1er producto):');
    console.log(JSON.stringify(buildMerchantProductResource(ready[0]), null, 2));
  }

  if (!doInsert) {
    console.log('\nDry-run. Para subir el catálogo:');
    console.log('  npm run merchant:sync-catalog');
    const weak = skipped.filter((s) => s.reason.startsWith('imagen'));
    if (weak.length) {
      console.log(`\nOmitidos por imagen débil/placeholder: ${weak.length}`);
    }
    return;
  }

  let okTotal = 0;
  /** @type {Array<{ offerId: string, message: string }>} */
  const allErrors = [];

  for (let i = 0; i < ready.length; i += BATCH_SIZE) {
    const chunk = ready.slice(i, i + BATCH_SIZE);
    const batchNo = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(ready.length / BATCH_SIZE);
    process.stdout.write(`Lote ${batchNo}/${totalBatches} (${chunk.length})… `);

    try {
      const { ok, errors } = await insertProductsBatch(chunk, { concurrency: CONCURRENCY });
      okTotal += ok;
      allErrors.push(...errors);
      console.log(`ok=${ok} err=${errors.length}`);
    } catch (err) {
      console.log('FALLÓ');
      for (const p of chunk) {
        allErrors.push({ offerId: p.offerId, message: err.message });
      }
    }

    if (i + BATCH_SIZE < ready.length) await sleep(BATCH_PAUSE_MS);
  }

  console.log('\n=== Resultado ===');
  console.log('Insertados/actualizados OK:', okTotal);
  console.log('Errores:', allErrors.length);

  if (allErrors.length) {
    const sample = allErrors.slice(0, 15);
    console.log('Primeros errores:');
    for (const e of sample) {
      console.log(`  - ${e.offerId}: ${e.message}`);
    }
    const reportPath = path.join(ROOT, 'data', '_tmp-merchant-sync-errors.json');
    fs.writeFileSync(reportPath, JSON.stringify({ okTotal, errors: allErrors }, null, 2));
    console.log('Reporte completo:', reportPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
