import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const incompletos = [];

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const fm = raw.split('---')[1] || '';
  if (/^draft:\s*true/m.test(fm)) continue;
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  const specs = [...fm.matchAll(/^\s*-\s*"?(.*?)"?\s*$/gm)].map((m) => m[1]);
  const p = {
    f,
    title: get('title'),
    brand: get('brand'),
    model: get('model'),
    power: get('power'),
    cat: get('category'),
    sku: get('sku'),
    specs: specs.length,
  };

  const texto = `${p.title} ${p.model} ${p.power}`;
  const tienePotencia = /\d+(?:[.,]\d+)?\s*(kW|W|kWh|A)\b/i.test(texto) || /SUN2000-\d|HMS-\d|HMT-\d|QUATTRO|MULTIPLUS/i.test(texto);
  const specsPobres = p.specs <= 4;

  if (p.cat === 'inversores' && (!tienePotencia || specsPobres || /victron/i.test(p.brand + p.title))) {
    incompletos.push({ ...p, tienePotencia, specsPobres });
  }
}

console.log('Inversores a revisar:', incompletos.length);
const victron = incompletos.filter((p) => /victron/i.test(p.brand + p.title));
console.log('\n=== VICTRON INVERSORES ===', victron.length);
for (const p of victron) {
  console.log(`  power=${(p.power || '-').padEnd(8)} specs=${p.specs}  ${p.title.slice(0, 75)}`);
  console.log(`    file=${p.f} model=${p.model || '-'} sku=${p.sku || '-'}`);
}

console.log('\n=== OTROS INVERSORES SIN POTENCIA CLARA ===');
for (const p of incompletos.filter((p) => !p.tienePotencia && !/victron/i.test(p.brand + p.title)).slice(0, 40)) {
  console.log(`  [${(p.brand || '-').padEnd(10)}] ${p.title.slice(0, 70)}`);
}

// Buscar códigos Victron típicos en el PDF
const pdf = fs.readFileSync(path.join(import.meta.dirname, '..', 'data', '_tmp-agosto-2026.txt'), 'utf8');
const lineasVictron = pdf.split(/\r?\n/).filter((l) => /victron|quattro|multiplus|phoenix|multiplus|inverter/i.test(l));
console.log('\n=== LINEAS PDF CON VICTRON/INVERTER (muestra) ===');
for (const l of lineasVictron.slice(0, 80)) {
  // quitar precios USD
  const limpia = l.replace(/\d+[.,]\d+\s*USD/gi, '').replace(/\s+/g, ' ').trim();
  if (limpia.length > 10) console.log(' ', limpia.slice(0, 140));
}
