import fs from 'node:fs';

const pdf = fs.readFileSync('data/_tmp-agosto-2026.txt', 'utf8');

// Quitar precios y normalizar
const texto = pdf
  .replace(/\d+[.,]\d+\s*USD/gi, ' ')
  .replace(/\s+/g, ' ');

// Extraer filas tipo: CODIGO + descripción + Victron Energy
const re = /\b((?:PIN|PMP|QUA|PMP48|SCC|LYN|BAM|BPR|ORT|ASS|BPP|CP|CMP)[A-Z0-9]{6,})\s*([^\n]*?)(?=\b(?:PIN|PMP|QUA|SCC|LYN|BAM|BPR|ORT|ASS|BPP|CMP|ICM|ICC|FRONIUS|HUAWEI|GROWATT|SOLIS|DEYE|GOODWE|HOYMILES|APS|MUST|STUDER|EPEVER|INTI|OLMO|CEDRO)\b|\d+[.,]\d+\s*USD|$)/gi;

// Mejor: línea a línea del archivo original
const lineas = pdf.split(/\r?\n/);
const catalogo = [];

for (const linea of lineas) {
  const limpia = linea.replace(/\d+[.,]\d+\s*USD/gi, '').trim();
  if (!limpia) continue;

  // Código al inicio pegado a la descripción (PDF sin espacios)
  const m = limpia.match(/^([A-Z]{2,4}\d{6,}[A-Z0-9]*)(.+?)(?:Victron Energy|Victron)?$/i);
  if (!m) continue;
  const codigo = m[1].trim();
  let desc = m[2].replace(/\*If 0,.*?(\*|Victron).*$/i, '').replace(/Victron Energy/gi, '').trim();
  if (!desc || desc.length < 5) continue;
  if (!/victron|phoenix|multiplus|quattro|smartsolar|bluesolar|inverter|mppt|charge/i.test(linea + desc)) {
    // incluir igual si el código es PIN/PMP/QUA
    if (!/^(PIN|PMP|QUA)/i.test(codigo)) continue;
  }
  catalogo.push({ codigo: codigo.toUpperCase(), desc: desc.replace(/\s+/g, ' ').trim(), linea: limpia.slice(0, 160) });
}

const inversores = catalogo.filter((c) => /^(PIN|PMP|QUA)/i.test(c.codigo));
console.log('Códigos inversor Victron en PDF:', inversores.length);
for (const c of inversores) {
  console.log(`${c.codigo.padEnd(16)} ${c.desc.slice(0, 90)}`);
}

fs.writeFileSync(
  'data/_tmp-victron-pdf.json',
  JSON.stringify({ inversores, catalogo: catalogo.slice(0, 500) }, null, 2)
);
console.log('\nGuardado data/_tmp-victron-pdf.json');
