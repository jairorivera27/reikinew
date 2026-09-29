/**
 * Genera un PDF con TODOS los productos de la tienda
 * (src/content/productos) — solo catálogo de tienda.
 *
 * Uso:
 *   node scripts/export-catalogo-tienda-pdf.mjs
 *   node scripts/export-catalogo-tienda-pdf.mjs data/mi-catalogo.pdf
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRODUCTOS_DIR = path.join(ROOT, 'src', 'content', 'productos');
const CATEGORIAS_JSON = path.join(ROOT, 'src', 'config', 'categorias-tienda.json');
const SITE = 'https://reikisolar.com.co';
const DEFAULT_OUT = path.join(ROOT, 'data', 'catalogo-tienda-reiki.pdf');

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

function loadCategories() {
  try {
    const raw = JSON.parse(fs.readFileSync(CATEGORIAS_JSON, 'utf8'));
    const list = (raw.categorias || []).slice().sort((a, b) => (a.orden || 99) - (b.orden || 99));
    /** @type {Record<string, { nombre: string, orden: number }>} */
    const map = {};
    for (const c of list) map[c.id] = { nombre: c.nombre || c.id, orden: c.orden || 99 };
    return { list, map };
  } catch {
    return { list: [], map: {} };
  }
}

function isDraft(v) {
  return v === true || v === 'true';
}

function loadProducts() {
  const { map } = loadCategories();
  const files = fs.readdirSync(PRODUCTOS_DIR).filter((f) => f.endsWith('.md'));
  /** @type {object[]} */
  const products = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/i, '');
    const raw = fs.readFileSync(path.join(PRODUCTOS_DIR, file), 'utf8');
    const d = parseProductMd(raw);
    if (!d?.title) continue;
    if (isDraft(d.draft)) continue;

    const cat = String(d.category || 'otros').trim() || 'otros';
    products.push({
      slug,
      title: String(d.title).trim(),
      brand: String(d.brand || '').trim(),
      model: String(d.model || '').trim(),
      sku: String(d.sku || '').trim(),
      price: String(d.price || '').trim(),
      stock: String(d.stock || '').trim(),
      power: String(d.power || '').trim(),
      category: cat,
      categoryName: map[cat]?.nombre || cat,
      categoryOrder: map[cat]?.orden ?? 99,
      order: Number(d.order) || 99999,
      url: `${SITE}/tienda/${slug}`,
    });
  }

  products.sort((a, b) => {
    if (a.categoryOrder !== b.categoryOrder) return a.categoryOrder - b.categoryOrder;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, 'es');
  });

  return products;
}

function groupByCategory(products) {
  /** @type {Map<string, object[]>} */
  const groups = new Map();
  for (const p of products) {
    const key = p.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return groups;
}

function drawHeader(doc, pageW, margin) {
  doc
    .fillColor('#111')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('REIKI Energía Solar — Catálogo tienda', margin, 28, {
      width: pageW - margin * 2 - 80,
      continued: false,
    });
  doc
    .fillColor('#666')
    .font('Helvetica')
    .fontSize(8)
    .text(SITE.replace('https://', ''), pageW - margin - 120, 28, { width: 120, align: 'right' });
  doc
    .moveTo(margin, 42)
    .lineTo(pageW - margin, 42)
    .strokeColor('#ddd')
    .stroke();
}

function drawFooter(doc, pageW, pageH, margin, pageNum, totalPages) {
  doc
    .moveTo(margin, pageH - 36)
    .lineTo(pageW - margin, pageH - 36)
    .strokeColor('#ddd')
    .stroke();
  doc
    .fillColor('#888')
    .font('Helvetica')
    .fontSize(8)
    .text(`Página ${pageNum} de ${totalPages}`, margin, pageH - 28, {
      width: pageW - margin * 2,
      align: 'center',
    });
}

async function buildPdf(outPath) {
  const products = loadProducts();
  const groups = groupByCategory(products);
  const generatedAt = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 54, bottom: 48, left: 40, right: 40 },
    bufferPages: true,
    info: {
      Title: 'Catálogo tienda — Reiki Energía Solar',
      Author: 'Reiki Energía Solar SAS',
      Subject: 'Listado completo de productos de la tienda online',
      CreationDate: new Date(),
    },
  });

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 40;
  const contentW = pageW - margin * 2;

  // —— Portada ——
  doc.fillColor('#0f172a').rect(0, 0, pageW, pageH).fill();
  doc
    .fillColor('#fbbf24')
    .font('Helvetica-Bold')
    .fontSize(28)
    .text('REIKI', margin, 200, { width: contentW, align: 'center' });
  doc
    .fillColor('#ffffff')
    .font('Helvetica')
    .fontSize(14)
    .text('energía solar', margin, 238, { width: contentW, align: 'center' });
  doc
    .fillColor('#e2e8f0')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('Catálogo de la tienda', margin, 300, { width: contentW, align: 'center' });
  doc
    .fillColor('#94a3b8')
    .font('Helvetica')
    .fontSize(11)
    .text(`Solo productos publicados en ${SITE}/tienda`, margin, 330, {
      width: contentW,
      align: 'center',
    });
  doc
    .fillColor('#cbd5e1')
    .fontSize(12)
    .text(`${products.length} productos`, margin, 380, { width: contentW, align: 'center' });
  doc
    .fillColor('#64748b')
    .fontSize(9)
    .text(`Generado: ${generatedAt}`, margin, 410, { width: contentW, align: 'center' });
  doc
    .fillColor('#64748b')
    .fontSize(9)
    .text('Reiki Energía Solar SAS · Guarne, Antioquia · Colombia', margin, 700, {
      width: contentW,
      align: 'center',
    });

  // —— Índice ——
  doc.addPage();
  let y = 54;
  doc.fillColor('#111').font('Helvetica-Bold').fontSize(16).text('Índice por categoría', margin, y);
  y = doc.y + 16;

  for (const [cat, items] of groups) {
    if (y > pageH - 60) {
      doc.addPage();
      y = 54;
    }
    const name = items[0]?.categoryName || cat;
    doc
      .fillColor('#111')
      .font('Helvetica')
      .fontSize(11)
      .text(name, margin, y, { width: contentW - 60, continued: false });
    doc
      .fillColor('#666')
      .font('Helvetica')
      .fontSize(11)
      .text(String(items.length), margin, y, { width: contentW, align: 'right' });
    y += 18;
  }

  // —— Columnas ——
  const col = {
    n: { x: margin, w: 28 },
    marca: { x: margin + 30, w: 72 },
    nombre: { x: margin + 104, w: 250 },
    sku: { x: margin + 356, w: 90 },
    precio: { x: margin + 448, w: 84 },
  };

  function ensureSpace(needed) {
    if (doc.y + needed > pageH - 50) {
      doc.addPage();
      doc.y = 54;
    }
  }

  function drawTableHeader() {
    ensureSpace(28);
    const hy = doc.y;
    doc.fillColor('#f1f5f9').rect(margin, hy - 2, contentW, 16).fill();
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8);
    doc.text('#', col.n.x, hy, { width: col.n.w });
    doc.text('Marca', col.marca.x, hy, { width: col.marca.w });
    doc.text('Producto', col.nombre.x, hy, { width: col.nombre.w });
    doc.text('SKU', col.sku.x, hy, { width: col.sku.w });
    doc.text('Precio', col.precio.x, hy, { width: col.precio.w, align: 'right' });
    doc.y = hy + 16;
  }

  let globalIdx = 0;
  for (const [, items] of groups) {
    doc.addPage();
    doc.y = 54;
    const catName = items[0]?.categoryName || items[0]?.category || 'Categoría';

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(14).text(catName, margin, doc.y);
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(9)
      .text(`${items.length} productos`, margin, doc.y + 2);
    doc.y += 8;
    drawTableHeader();

    for (const p of items) {
      globalIdx += 1;
      ensureSpace(36);
      const startY = doc.y;
      const rowBg = globalIdx % 2 === 0 ? '#fafafa' : '#ffffff';

      // altura según nombre
      doc.font('Helvetica').fontSize(8);
      const nameH = doc.heightOfString(p.title, { width: col.nombre.w });
      const rowH = Math.max(14, nameH + 4);

      if (startY + rowH > pageH - 50) {
        doc.addPage();
        doc.y = 54;
        drawTableHeader();
      }

      const y0 = doc.y;
      doc.fillColor(rowBg).rect(margin, y0 - 1, contentW, rowH).fill();
      doc.fillColor('#111').font('Helvetica').fontSize(8);
      doc.text(String(globalIdx), col.n.x, y0, { width: col.n.w });
      doc.fillColor('#334155').text((p.brand || '—').slice(0, 18), col.marca.x, y0, {
        width: col.marca.w,
        ellipsis: true,
      });
      doc.fillColor('#0f172a').text(p.title, col.nombre.x, y0, { width: col.nombre.w });
      doc.fillColor('#475569').text((p.sku || '—').slice(0, 16), col.sku.x, y0, {
        width: col.sku.w,
        ellipsis: true,
      });
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(p.price || '—', col.precio.x, y0, {
        width: col.precio.w,
        align: 'right',
      });
      doc.y = y0 + rowH;
    }
  }

  // Numeración de páginas (omitir portada en estilo o incluir todas)
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  for (let i = 0; i < totalPages; i += 1) {
    doc.switchToPage(i);
    if (i === 0) continue; // portada sin header/footer estándar
    drawHeader(doc, pageW, margin);
    drawFooter(doc, pageW, pageH, margin, i + 1, totalPages);
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { count: products.length, pages: totalPages, outPath, categories: groups.size };
}

const out = path.resolve(process.argv[2] || DEFAULT_OUT);
fs.mkdirSync(path.dirname(out), { recursive: true });

buildPdf(out)
  .then((r) => {
    console.log('PDF catálogo tienda generado');
    console.log('  Productos:', r.count);
    console.log('  Categorías:', r.categories);
    console.log('  Páginas:', r.pages);
    console.log('  Archivo:', r.outPath);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
