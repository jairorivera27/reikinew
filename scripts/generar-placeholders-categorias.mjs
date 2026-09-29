/**
 * Genera un SVG placeholder por categoría en public/images/placeholders/.
 * Se usa cuando un producto no tiene foto real ni logo de marca disponible.
 *
 * Uso: node scripts/generar-placeholders-categorias.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const OUTDIR = path.join(ROOT, 'public', 'images', 'placeholders');
const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'config', 'categorias-tienda.json'), 'utf8')
);

const MORADO = '#6b2181';
const MORADO_CLARO = '#c4a0d0';

/** Dibujo central de cada categoría, sobre un lienzo de 400x300 centrado en (200, 130). */
const DIBUJOS = {
  paneles: `
    <g transform="translate(200 130)">
      <g transform="skewX(-12)">
        ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) =>
          `<rect x="${-84 + c * 44}" y="${-54 + r * 38}" width="38" height="32" rx="3" fill="none" stroke="${MORADO}" stroke-width="4"/>`
        ).join('')).join('')}
      </g>
      <path d="M-30 66 L30 66" stroke="${MORADO}" stroke-width="5" stroke-linecap="round"/>
      <path d="M0 60 L0 78" stroke="${MORADO}" stroke-width="5" stroke-linecap="round"/>
    </g>`,
  inversores: `
    <g transform="translate(200 130)">
      <rect x="-70" y="-62" width="140" height="124" rx="14" fill="none" stroke="${MORADO}" stroke-width="6"/>
      <path d="M-42 10 q21 -60 42 0 q21 60 42 0" fill="none" stroke="${MORADO}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="-46" cy="-40" r="6" fill="${MORADO_CLARO}"/>
      <path d="M-40 44 L40 44" stroke="${MORADO_CLARO}" stroke-width="6" stroke-linecap="round"/>
    </g>`,
  baterias: `
    <g transform="translate(200 130)">
      <rect x="-78" y="-46" width="146" height="92" rx="12" fill="none" stroke="${MORADO}" stroke-width="6"/>
      <rect x="68" y="-16" width="14" height="32" rx="4" fill="${MORADO}"/>
      <rect x="-60" y="-28" width="30" height="56" rx="4" fill="${MORADO_CLARO}"/>
      <rect x="-22" y="-28" width="30" height="56" rx="4" fill="${MORADO_CLARO}"/>
      <rect x="16" y="-28" width="30" height="56" rx="4" fill="none" stroke="${MORADO_CLARO}" stroke-width="4"/>
    </g>`,
  reflectores: `
    <g transform="translate(200 130)">
      <rect x="-62" y="-58" width="124" height="52" rx="8" fill="none" stroke="${MORADO}" stroke-width="6"/>
      <path d="M-62 -6 L-92 62 L92 62 L62 -6 Z" fill="${MORADO_CLARO}" opacity="0.35"/>
      <path d="M-30 -6 L-30 40 M0 -6 L0 52 M30 -6 L30 40" stroke="${MORADO}" stroke-width="5" stroke-linecap="round"/>
    </g>`,
  controladores: `
    <g transform="translate(200 130)">
      <rect x="-56" y="-56" width="112" height="112" rx="10" fill="none" stroke="${MORADO}" stroke-width="6"/>
      <rect x="-26" y="-26" width="52" height="52" rx="6" fill="${MORADO_CLARO}" opacity="0.5"/>
      ${[-34, 0, 34].map((p) => `
        <path d="M${p} -56 L${p} -78" stroke="${MORADO}" stroke-width="6" stroke-linecap="round"/>
        <path d="M${p} 56 L${p} 78" stroke="${MORADO}" stroke-width="6" stroke-linecap="round"/>
        <path d="M-56 ${p} L-78 ${p}" stroke="${MORADO}" stroke-width="6" stroke-linecap="round"/>
        <path d="M56 ${p} L78 ${p}" stroke="${MORADO}" stroke-width="6" stroke-linecap="round"/>`).join('')}
    </g>`,
  protecciones: `
    <g transform="translate(200 130)">
      <path d="M0 -70 L66 -44 V6 C66 44 36 66 0 76 C-36 66 -66 44 -66 6 V-44 Z"
            fill="none" stroke="${MORADO}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M10 -30 L-16 6 H4 L-8 40 L20 0 H0 Z" fill="${MORADO}"/>
    </g>`,
  cargadores: `
    <g transform="translate(200 130)">
      <path d="M-84 26 L-70 -18 H34 L52 26 Z" fill="none" stroke="${MORADO}" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="-56" cy="40" r="15" fill="none" stroke="${MORADO}" stroke-width="6"/>
      <circle cx="24" cy="40" r="15" fill="none" stroke="${MORADO}" stroke-width="6"/>
      <path d="M-16 -34 L-32 -66 M-16 -34 L4 -60" stroke="${MORADO_CLARO}" stroke-width="6" stroke-linecap="round"/>
      <path d="M80 -30 L58 4 H76 L64 40 L92 -2 H74 Z" fill="${MORADO}"/>
    </g>`,
  monitoreo: `
    <g transform="translate(200 130)">
      <rect x="-80" y="-58" width="160" height="116" rx="12" fill="none" stroke="${MORADO}" stroke-width="6"/>
      <path d="M-56 26 L-22 -12 L4 14 L54 -36" fill="none" stroke="${MORADO}" stroke-width="6"
            stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="54" cy="-36" r="8" fill="${MORADO}"/>
      <path d="M-56 44 L56 44" stroke="${MORADO_CLARO}" stroke-width="5" stroke-linecap="round"/>
    </g>`,
  bombeo: `
    <g transform="translate(200 130)">
      <path d="M0 -72 C34 -30 54 -6 54 18 A54 54 0 0 1 -54 18 C-54 -6 -34 -30 0 -72 Z"
            fill="none" stroke="${MORADO}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M-24 14 A24 24 0 0 0 0 38" fill="none" stroke="${MORADO_CLARO}" stroke-width="6" stroke-linecap="round"/>
      <path d="M-78 62 L78 62" stroke="${MORADO}" stroke-width="6" stroke-linecap="round"/>
    </g>`,
  accesorios: `
    <g transform="translate(200 130)">
      <rect x="-48" y="-56" width="96" height="72" rx="10" fill="none" stroke="${MORADO}" stroke-width="6"/>
      <path d="M-28 -20 H28 M-28 0 H28 M-28 20 H12" stroke="${MORADO_CLARO}" stroke-width="5" stroke-linecap="round"/>
      <path d="M-18 28 L-18 58 L18 58 L18 28" fill="none" stroke="${MORADO}" stroke-width="6" stroke-linejoin="round"/>
      <circle cx="0" cy="58" r="10" fill="${MORADO}"/>
    </g>`,
};

function svg(cat) {
  const dibujo = DIBUJOS[cat.id];
  if (!dibujo) throw new Error(`Falta el dibujo para la categoría "${cat.id}"`);
  const etiqueta = cat.nombre.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" role="img" aria-label="${etiqueta}">
  <rect width="400" height="300" rx="16" fill="#f8fafc"/>
  <rect x="1" y="1" width="398" height="298" rx="16" fill="none" stroke="#eef2ff" stroke-width="2"/>
  ${dibujo.trim()}
  <text x="200" y="256" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="18" font-weight="600" fill="#6b7280">${etiqueta}</text>
  <text x="200" y="278" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="13" fill="#9ca3af">Imagen referencial</text>
</svg>
`;
}

/**
 * Banner provisional del bloque de liquidación. Va solo el fondo: el descuento, el
 * nombre y los precios los pinta la ficha por encima, y si el SVG también los trae los
 * dos textos se superponen y quedan ilegibles.
 */
function bannerPromocional() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400" role="img" aria-label="Banner de liquidación">
  <defs>
    <linearGradient id="fondoPromo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a1259"/>
      <stop offset="55%" stop-color="${MORADO}"/>
      <stop offset="100%" stop-color="#a8339c"/>
    </linearGradient>
    <linearGradient id="brilloPromo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="400" fill="url(#fondoPromo)"/>
  <rect width="1200" height="200" fill="url(#brilloPromo)"/>

  ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
    `<circle cx="${90 + i * 150}" cy="${i % 2 === 0 ? 60 : 340}" r="${i % 3 === 0 ? 46 : 28}" fill="#ffffff" opacity="0.06"/>`
  ).join('\n  ')}

  <g transform="translate(1176 380)">
    <text text-anchor="end" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
          font-size="14" font-weight="600" letter-spacing="1.2" fill="#ffffff" opacity="0.45">IMAGEN DE PRUEBA · REEMPLAZAR</text>
  </g>
</svg>
`;
}

fs.mkdirSync(OUTDIR, { recursive: true });
for (const cat of config.categorias) {
  const destino = path.join(OUTDIR, `${cat.id}.svg`);
  fs.writeFileSync(destino, svg(cat), 'utf8');
  console.log('✓', path.relative(ROOT, destino));
}

const destinoPromo = path.join(OUTDIR, 'promo-liquidacion.svg');
fs.writeFileSync(destinoPromo, bannerPromocional(), 'utf8');
console.log('✓', path.relative(ROOT, destinoPromo));

console.log(`\n${config.categorias.length} placeholders de categoría + 1 banner promocional generados.`);
