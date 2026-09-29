/**
 * Exporta todas las fichas en src/content/productos a un Excel (marca, nombre, potencia, precio, especificaciones, etc.).
 * Uso: node scripts/export-productos-tienda-xlsx.mjs [ruta-salida.xlsx]
 */

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const ROOT = path.join(import.meta.dirname, '..');
const PRODUCTOS_DIR = path.join(ROOT, 'src', 'content', 'productos');
const DEFAULT_OUT = path.join(ROOT, 'data', 'catalogo-productos-tienda.xlsx');

/* —— Misma heurística de potencia que src/utils/productCardCompactMeta.ts —— */
function norm(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
}

function formatDecimalToken(tok) {
  const n = parseFloat(tok.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return tok;
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return String(n).replace('.', ',');
}

function extractPowerOrCapacityLabel(title) {
  const t = title.trim();
  if (!t) return null;
  const u = norm(t);
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*kWp\b/i);
  if (m) return `${formatDecimalToken(m[1])} kWp`;
  m = t.match(/(\d+(?:[.,]\d+)?)\s*kWh\b/i);
  if (m) return `${formatDecimalToken(m[1])} kWh`;
  m = u.match(/LUNA2000-(\d+)(?:KW|K[W]?)(?:-|\/|\b)/);
  if (m) return `${parseInt(m[1], 10)} kWh`;
  m = u.match(/SOLUNA\s+(\d+)\s*K\s+PACK\b/);
  if (m) return `${parseInt(m[1], 10)} kWh`;
  m = u.match(/SUN2000-(\d+)K(?:TL|-(?:LC|MGL|M2|MG|HV|KL|H|M3))?[A-Z0-9]*/);
  if (!m) m = u.match(/SUN2000-(\d+)K\b/);
  if (m) return `${parseInt(m[1], 10)} kW`;
  m = u.match(/\bHMS-(\d+)-|\bHMT-(\d+)-/iu);
  if (m) {
    const n = parseInt(m[1] || m[2], 10);
    if (n >= 50) return `${n} W`;
  }
  m = u.match(/\b(?:DS3[^\s]*|\bAPS\b[^\d]*)(\d{3,5})\s*W\b/ui);
  if (m) return `${parseInt(m[1], 10)} W`;
  m = u.match(/\b(\d{3,5})\s*W\b/i);
  if (m) return `${parseInt(m[1], 10)} W`;
  m = u.match(/(?:^|\s)(\d{1,3}(?:[.,]\d)?)\s*kW\b/ui);
  if (m) return `${formatDecimalToken(m[1])} kW`;
  m = u.match(/EH\d+P(\d+(?:\.\d+)?)K\b/);
  if (!m) m = u.match(/GR\d*P(\d+(?:\.\d+)?)K\b/);
  if (!m) m = u.match(/S\d-[A-Z0-9]+P(\d+(?:\.\d+)?)K\b/);
  if (m) {
    const raw = m[1].replace(',', '.');
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n >= 0.8 && n <= 500) return `${formatDecimalToken(m[1])} kW`;
  }
  m = u.match(/-GC(\d+)K\b/);
  if (m) {
    const kw = parseInt(m[1], 10);
    if (kw >= 1 && kw <= 400) return `${kw} kW`;
  }
  m = u.match(/(?:GU|GC)(\d+)K\b/);
  if (m) {
    const kw = parseInt(m[1], 10);
    if (kw >= 1 && kw <= 600) return `${kw} kW`;
  }
  m = u.match(/5[.,]12\s*KWH|\(5\.12KWH/);
  if (m) return '5,12 kWh';
  return null;
}

function potenciaFromSpecs(specs) {
  if (!Array.isArray(specs)) return '';
  const line = specs.find((s) => /potencia\s*:/i.test(String(s)));
  if (line) return String(line).replace(/^.*potencia\s*:\s*/i, '').trim();
  return '';
}

function unquoteYamlString(v) {
  const t = v.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
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

const CATEGORY_ORDER = [
  'paneles',
  'inversores',
  'baterias',
  'reflectores',
  'controladores',
  'protecciones',
  'cargadores',
];

function sortKey(cat, ord, slug) {
  const ci = CATEGORY_ORDER.indexOf(cat);
  const cidx = ci === -1 ? 99 : ci;
  return [cidx, Number(ord) || 9999, slug];
}

function main() {
  const outPath = path.resolve(process.argv[2] || DEFAULT_OUT);
  const files = fs.readdirSync(PRODUCTOS_DIR).filter((f) => f.endsWith('.md'));
  const rows = [];

  for (const file of files) {
    const full = path.join(PRODUCTOS_DIR, file);
    const raw = fs.readFileSync(full, 'utf8');
    const d = parseProductMd(raw);
    if (!d?.title) {
      console.warn('[omit]', file, 'sin frontmatter válido');
      continue;
    }
    const slug = file.replace(/\.md$/i, '');
    const title = String(d.title);
    const potencia =
      extractPowerOrCapacityLabel(title) || potenciaFromSpecs(d.specifications) || '';
    const specsText = Array.isArray(d.specifications) ? d.specifications.join('\n') : '';
    rows.push({
      slug,
      categoria: d.category ?? '',
      orden: Number(d.order) || '',
      marca: d.brand ?? '',
      modelo: d.model ?? '',
      nombre: title,
      potencia,
      precio: d.price ?? '',
      stock: d.stock ?? '',
      especificaciones: specsText,
      descripcion: d.description ?? '',
    });
  }

  rows.sort((a, b) => {
    const ka = sortKey(String(a.categoria), a.orden, a.slug);
    const kb = sortKey(String(b.categoria), b.orden, b.slug);
    for (let i = 0; i < 3; i++) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return String(a.nombre).localeCompare(String(b.nombre), 'es');
  });

  const sheetData = rows.map((r) => ({
    Slug: r.slug,
    Categoría: r.categoria,
    Orden: r.orden,
    Marca: r.marca,
    Modelo: r.modelo,
    Nombre: r.nombre,
    Potencia: r.potencia,
    Precio: r.precio,
    Stock: r.stock,
    Especificaciones: r.especificaciones,
    Descripción: r.descripcion,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 26 },
    { wch: 14 },
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 42 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 72 },
    { wch: 48 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  XLSX.writeFile(wb, outPath);
  console.log(`Excel generado (${rows.length} productos): ${outPath}`);
}

main();
