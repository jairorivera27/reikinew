import fs from 'fs';
import { classifyMatchStrict, norm } from './lib/match-tipos.mjs';

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const lines = fs.readFileSync('imagenes-proveedores/manifest.csv', 'utf8').split(/\r?\n/);
const headers = splitCsvLine(lines[0]);
const line = lines.find((l) => l.includes('scc010010050r') && l.includes('01-controlador'));
const cols = splitCsvLine(line);
const row = {};
headers.forEach((h, i) => (row[h] = cols[i] ?? ''));
const page = (row.notas.match(/page=(https?:\/\/\S+)/) || [])[1] || '';
const hay = `${row.url_origen} ${row.archivo_local} ${page}`;
const model = 'SCC010010050R';
console.log({ page, url: row.url_origen, file: row.archivo_local });
console.log('includes model?', norm(hay).includes(norm(model)));
console.log('includes SCC0100?', norm(hay).includes('SCC0100'));
const product = {
  title: 'Controlador de Carga Solar MPPT Victron SCC010010050R',
  brand: 'Victron',
  model,
  sku: model,
  category: 'controladores',
  specifications: ['Tipo: MPPT'],
};
console.log(classifyMatchStrict(product, '', page, hay));
