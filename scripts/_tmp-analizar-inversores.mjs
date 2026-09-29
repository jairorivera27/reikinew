import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const inversores = [];
const solis = [];

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const fm = raw.split('---')[1] || '';
  if (/^draft:\s*true/m.test(fm)) continue;
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  if (get('category') !== 'inversores') continue;
  const p = {
    f,
    title: get('title'),
    brand: get('brand'),
    model: get('model'),
    power: get('power'),
    price: get('price'),
  };
  inversores.push(p);
  if (/solis/i.test(p.brand) || /solis/i.test(p.title) || /solis/i.test(p.model)) solis.push(p);
}

console.log('Inversores activos:', inversores.length);
console.log('Solis a eliminar:', solis.length);
console.log('\n=== SOLIS ===');
for (const p of solis) {
  console.log(`  ${p.power.padEnd(10)} ${(p.brand || '-').padEnd(10)} ${p.title.slice(0, 70)}`);
}

console.log('\n=== MUESTRA DE TITULOS (30) ===');
for (const p of inversores.slice(0, 30)) {
  console.log(`  [${(p.brand || '-').padEnd(10)}] power=${(p.power || '-').padEnd(12)} ${p.title.slice(0, 65)}`);
}

// Detectar patrones de tipo en títulos actuales
const tipos = { hibrido: 0, ongrid: 0, offgrid: 0, micro: 0, desconoc: 0 };
for (const p of inversores) {
  const t = `${p.title} ${p.model}`.toLowerCase();
  if (/h[ií]brid/.test(t)) tipos.hibrido++;
  else if (/off.?grid|offgrid|aislad/.test(t)) tipos.offgrid++;
  else if (/on.?grid|ongrid|grid.?tie|interconex/.test(t)) tipos.ongrid++;
  else if (/microinversor|hms-|hmt-|ds3|qt2/.test(t)) tipos.micro++;
  else tipos.sinTipo++;
}
console.log('\nTipos detectables en título/modelo:', tipos);

// 114kW sospechosos
console.log('\n=== Potencias sospechosas (114 / 114k) ===');
for (const p of inversores) {
  if (/114/.test(p.title) || /114/.test(p.power) || /114/.test(p.model || '')) {
    console.log(`  ${p.f}: power=${p.power} title=${p.title}`);
  }
}
