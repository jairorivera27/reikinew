import fs from 'node:fs';

// 1) Restaurar controlador-mppt-100a a provisional (match wrong)
const a = 'src/content/productos/controlador-mppt-100a.md';
let raw = fs.readFileSync(a, 'utf8');
const bodyA = raw.replace(/^---[\s\S]*?---/, '');
fs.writeFileSync(
  a,
  `---
title: "Controlador MPPT 100A"
description: "Controlador de carga solar MPPT profesional de 100 amperios. Para instalaciones comerciales e industriales de gran escala."
image: "/images/productos-estudio/victron-smartsolar-mppt-100-50-prov.webp"
category: "controladores"
price: "$1.289.000"
specifications:
  - "Corriente máxima: 100A"
  - "Voltaje: 12V/24V/48V auto"
  - "Tecnología: MPPT"
  - "Comunicación: Bluetooth, RS485"
  - "App móvil y software PC"
  - "Pantalla LCD táctil"
  - "Eficiencia: 99.5%"
brand: "Victron"
stock: "disponible"
order: 5
imageThumb: "/images/productos-estudio/victron-smartsolar-mppt-100-50-prov.webp"
imageAlt: "Victron Controlador MPPT 100A – Reiki Energía Solar"
imageOriginal: "/images/productos-tienda/controladores/controlador-mppt-100a-medellin.png"
imagen_provisional: true
---${bodyA}`
);
console.log('restored controlador-mppt-100a');

// 2) Aplicar foto Autosolar 100/50 al SKU exacto SCC110050210
const b = 'src/content/productos/controlador-de-carga-solar-mppt-victron-scc110050210.md';
raw = fs.readFileSync(b, 'utf8');
const bodyB = raw.replace(/^---[\s\S]*?---/, '');
const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
const set = (t, k, v) => {
  const line = typeof v === 'boolean' ? `${k}: ${v}` : `${k}: "${v}"`;
  const re = new RegExp(`^${k}:\\s*.*$`, 'm');
  return re.test(t) ? t.replace(re, line) : `${t}\n${line}`;
};
let f = fm;
f = set(f, 'image', '/images/productos-estudio/victron-smartsolar-mppt-100-50.webp');
f = set(f, 'imageThumb', '/images/productos-estudio/victron-smartsolar-mppt-100-50-thumb.webp');
f = set(f, 'imageAlt', 'Victron SmartSolar MPPT 100/50 SCC110050210 – Reiki Energía Solar');
f = set(
  f,
  'imageOriginal',
  'proveedores/autosolar/controlador-carga-smartsolar-mppt-10050-victron-energy.jpg'
);
f = set(f, 'imagen_provisional', false);
f = set(f, 'imagenPendiente', false);
f = set(f, 'model', 'SCC110050210 (SmartSolar MPPT 100/50)');
fs.writeFileSync(b, `---\n${f}\n---${bodyB}`);
console.log('applied Autosolar 100/50 → SCC110050210');

// Fix CSV: remove wrong slug, add correct
const csv = 'docs/fuentes-imagenes.csv';
if (fs.existsSync(csv)) {
  let lines = fs.readFileSync(csv, 'utf8').split(/\r?\n/);
  lines = lines.filter((l) => !l.includes('controlador-mppt-100a'));
  const row =
    '"Controlador de Carga Solar MPPT Victron SCC110050210",controlador-de-carga-solar-mppt-victron-scc110050210,autosolar,https://cdn.autosolar.co/images/2008191/controlador-carga-smartsolar-mppt-10050-victron-energy.jpg,?,no,no,ok,SmartSolar MPPT 100/50 / SCC110050210';
  if (!lines.some((l) => l.includes('scc110050210'))) lines.push(row);
  fs.writeFileSync(csv, lines.filter(Boolean).join('\n') + '\n');
}
