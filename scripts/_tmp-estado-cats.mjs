import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'productos');
const por = {};
const draftPor = {};
const samples = { reflectores: [], bombeo: [], baterias: [], plomo: [] };

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const fm = raw.split('---')[1] || '';
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
  const cat = get('category') || '?';
  const draft = /^draft:\s*true/m.test(fm);
  const title = get('title');
  const brand = get('brand');
  const power = get('power');

  if (draft) {
    draftPor[cat] = (draftPor[cat] || 0) + 1;
    if (cat === 'reflectores' && samples.reflectores.length < 5)
      samples.reflectores.push({ f, title, brand, draft: true });
    if (cat === 'bombeo' && samples.bombeo.length < 8)
      samples.bombeo.push({ f, title, brand, draft: true });
    continue;
  }
  por[cat] = (por[cat] || 0) + 1;
  if (cat === 'reflectores' && samples.reflectores.length < 5)
    samples.reflectores.push({ f, title, brand, draft: false });
  if (cat === 'bombeo' && samples.bombeo.length < 8)
    samples.bombeo.push({ f, title, brand, draft: false });
  if (cat === 'baterias') {
    samples.baterias.push({ f, title, brand, power });
    if (/plomo|agm|gel|ácido|acido|lead/i.test(title + ' ' + (get('description') || ''))) {
      samples.plomo.push({ f, title });
    }
  }
}

console.log('ACTIVOS', por);
console.log('DRAFT', draftPor);
console.log('\nReflectores:', samples.reflectores);
console.log('\nBombeo:', samples.bombeo);
console.log('\nBaterías plomo sospechosas:', samples.plomo);
console.log('Baterías activas:', samples.baterias.length);
console.log('Muestra baterías:', samples.baterias.slice(0, 8));
