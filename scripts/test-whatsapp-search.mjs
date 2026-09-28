/**
 * 9 pruebas de búsqueda de catálogo WhatsApp.
 * Uso: node scripts/test-whatsapp-search.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  searchProducts,
  detectCategoryFromQuery,
  extractPowerQuery,
} from '../api/_lib/whatsapp-catalog.js';

function fsHasIndex() {
  try {
    const p = path.join(process.cwd(), 'data', 'whatsapp-product-index.json');
    if (!fs.existsSync(p)) return false;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(j) && j.length > 0;
  } catch {
    return false;
  }
}

const CASES = [
  {
    q: 'cotízame un inversor de 5kw',
    expect: 'needsInverterType',
    note: 'stopwords + categoría inversores + pide tipo',
  },
  {
    q: 'inversor híbrido 5kw',
    expectCat: 'inversores',
    expectUnit: 'kw',
    min: 1,
    note: 'híbrido 5 kW (no kWh)',
  },
  {
    q: 'batería 5kwh',
    expectCat: 'baterias',
    expectUnit: 'kwh',
    min: 1,
    note: 'kWh ≠ kW → solo baterías',
  },
  {
    q: 'panel 625w',
    expectCat: 'paneles',
    expectUnit: 'w',
    min: 1,
    note: 'paneles ~625 W',
  },
  {
    q: 'felicity 5kw off-grid',
    expectCat: 'inversores',
    min: 1,
    note: 'marca + off-grid + 5 kW',
  },
  {
    q: 'cuánto cuesta una batería de litio',
    expectCat: 'baterias',
    min: 1,
    note: 'stopwords + categoría baterías',
  },
  {
    q: 'reflector solar',
    expectCat: 'reflectores',
    min: 0,
    note: 'categoría reflectores',
  },
  {
    q: 'protector dc',
    expectCat: 'protecciones',
    min: 0,
    note: 'categoría protecciones',
  },
  {
    q: 'xyzzy noexiste 999zz',
    expectEmpty: true,
    note: 'sin categoría → vacío',
  },
];

function summarize(result) {
  if (result && result.needsInverterType) return { kind: 'needsInverterType' };
  if (!Array.isArray(result)) return { kind: 'other', result };
  return {
    kind: 'list',
    n: result.length,
    top: result.slice(0, 3).map((p) => `${p.nombre} (${p.categoria})`),
  };
}

let failed = 0;
console.log('=== Pruebas búsqueda catálogo ===\n');
console.log('Índice cargado:', fsHasIndex() ? 'sí' : 'NO (algunas pruebas pueden quedar en 0)\n');

for (const c of CASES) {
  const cat = detectCategoryFromQuery(c.q);
  const pow = extractPowerQuery(c.q);
  const result = searchProducts(c.q, { limit: 5 });
  const sum = summarize(result);
  let ok = true;
  let detail = '';

  if (c.expect === 'needsInverterType') {
    ok = sum.kind === 'needsInverterType';
    detail = ok ? 'pide tipo de inversor' : `got ${JSON.stringify(sum)}`;
  } else if (c.expectEmpty) {
    ok = Array.isArray(result) && result.length === 0;
    detail = `n=${Array.isArray(result) ? result.length : '?'}`;
  } else {
    const items = Array.isArray(result) ? result : [];
    if (c.expectCat && cat !== c.expectCat) {
      ok = false;
      detail = `cat detectada=${cat} (esperada ${c.expectCat})`;
    }
    if (ok && c.min != null && items.length < c.min) {
      const indexEmpty = !fsHasIndex();
      ok = indexEmpty;
      detail = indexEmpty
        ? 'índice vacío — skip'
        : `n=${items.length} < min ${c.min}; top=${(sum.top || []).join(' | ')}`;
    } else if (ok) {
      detail =
        `cat=${cat} power=${pow ? pow.value + pow.unit : '—'} n=${items.length}` +
        (sum.top?.length ? `\n    → ${sum.top.join('\n    → ')}` : '');
    }
    if (ok && c.expectUnit && pow && pow.unit !== c.expectUnit) {
      ok = false;
      detail = `unit ${pow.unit} ≠ ${c.expectUnit}`;
    }
  }

  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  "${c.q}"`);
  console.log(`       ${c.note}`);
  console.log(`       ${detail}\n`);
}

console.log('---');
console.log(`Resultado: ${CASES.length - failed}/${CASES.length} OK`);
if (failed) process.exit(1);
