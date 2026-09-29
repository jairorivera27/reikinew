import fs from 'fs';
const html = fs.readFileSync('dist/index.html', 'utf8');
const checks = [
  ['hero title', /Energía solar en Medellín y Colombia/],
  ['cta cotizar', /Cotizar proyecto/],
  ['cta tienda', /Ver tienda/],
  ['trust strip', /home-trust|Marcas aliadas/],
  ['seo intro', /leyes 1715 y 2099/],
  ['ver toda tienda', /Ver toda la tienda/],
  ['descuentos', /Ver descuentos/],
  ['reviews honest', /Opiniones de clientes en Antioquia/],
  ['og image', /og-default\.png/],
  ['schema address', /Carrera 80 #39-167 Local 105/],
  ['h1 visible', /<h1 class="hero-title">/],
];
for (const [name, re] of checks) {
  console.log(re.test(html) ? 'OK' : 'MISS', name);
}
