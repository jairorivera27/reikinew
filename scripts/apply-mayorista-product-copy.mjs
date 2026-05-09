/**
 * Actualiza description, specifications y cuerpo de todas las fichas cat-mayorista-*.md
 * usando scripts/lib/mayorista-product-copy.mjs (sin texto "Mayorista +X% · lista…").
 */

import fs from 'node:fs';
import path from 'node:path';
import { enrichMayoristaFicha } from './lib/mayorista-product-copy.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'src', 'content', 'productos');

function yamlEscapeLine(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function unquoteYamlString(v) {
  const t = v.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    return t
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return t;
}

function parseProductMd(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const fm = m[1];
  const body = m[2];
  const data = { bodyRest: body };
  const lines = fm.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^specifications:\s*$/.test(line)) {
      i += 1;
      data.specifications = [];
      while (i < lines.length && /^\s*-\s/.test(lines[i])) {
        const mm = lines[i].match(/^\s*-\s*(.+)\s*$/);
        if (mm) data.specifications.push(unquoteYamlString(mm[1]));
        i += 1;
      }
      continue;
    }
    const km = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (km) {
      const key = km[1];
      let val = km[2];
      if (key !== 'specifications') val = unquoteYamlString(val);
      data[key] = val;
    }
    i += 1;
  }
  return data;
}

function serializeProductMd(data, enr) {
  let s = '---\n';
  s += `title: ${yamlEscapeLine(data.title)}\n`;
  s += `description: ${yamlEscapeLine(enr.description)}\n`;
  s += `image: "${String(data.image).replace(/"/g, '')}"\n`;
  s += `category: "${String(data.category).replace(/"/g, '')}"\n`;
  s += `price: "${String(data.price).replace(/"/g, '')}"\n`;
  s += 'specifications:\n';
  for (const ln of enr.specifications) {
    s += `  - ${yamlEscapeLine(ln)}\n`;
  }
  s += `brand: "${String(data.brand ?? '').replace(/"/g, "'")}"\n`;
  s += `model: "${String(data.model ?? '').replace(/"/g, "'")}"\n`;
  s += `stock: "${String(data.stock ?? 'disponible').replace(/"/g, '')}"\n`;
  s += `order: ${Number(data.order) || 0}\n`;
  if (data.homeCarouselOrder != null && data.homeCarouselOrder !== '') {
    s += `homeCarouselOrder: ${Number(data.homeCarouselOrder)}\n`;
  }
  if (data.seoKeywords && Array.isArray(data.seoKeywords) && data.seoKeywords.length) {
    s += 'seoKeywords:\n';
    for (const k of data.seoKeywords) s += `  - ${yamlEscapeLine(k)}\n`;
  }
  if (data.seoDifferentiator) {
    s += `seoDifferentiator: ${yamlEscapeLine(data.seoDifferentiator)}\n`;
  }
  s += '---\n\n';
  s += enr.bodyMarkdown.trim();
  s += '\n';
  return s;
}

let updated = 0;
let skipped = 0;

for (const f of fs.readdirSync(DIR)) {
  if (!/^cat-mayorista-.*\.md$/i.test(f)) continue;
  const full = path.join(DIR, f);
  const raw = fs.readFileSync(full, 'utf8');
  const data = parseProductMd(raw);
  if (!data?.title) {
    skipped += 1;
    continue;
  }
  const enr = enrichMayoristaFicha({
    title: data.title,
    brand: data.brand || 'Genérico',
    category: data.category || 'protecciones',
  });
  fs.writeFileSync(full, serializeProductMd(data, enr), 'utf8');
  updated += 1;
}

console.log('Fichas mayorista actualizadas:', updated, '| omitidas (parse):', skipped);
