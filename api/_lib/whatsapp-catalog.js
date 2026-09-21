/**
 * Búsqueda ligera sobre el índice de tienda (data/whatsapp-product-index.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {{ slug: string, title: string, category: string, brand: string, price: string, model: string }[] | null} */
let cache = null;

function loadIndex() {
  if (cache) return cache;
  const candidates = [
    path.join(process.cwd(), 'data', 'whatsapp-product-index.json'),
    path.join(__dirname, '..', '..', 'data', 'whatsapp-product-index.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cache = JSON.parse(fs.readFileSync(p, 'utf8'));
        return cache;
      }
    } catch {
      /* next */
    }
  }
  cache = [];
  return cache;
}

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/**
 * @param {string} query
 * @param {{ category?: string, limit?: number }} [opts]
 */
export function searchProducts(query, opts = {}) {
  const q = norm(query);
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  if (!tokens.length) return [];
  const cat = norm(opts.category || '');
  const limit = Math.min(opts.limit || 5, 8);
  const site = String(process.env.WHATSAPP_SITE_URL || 'https://reikisolar.com.co').replace(/\/$/, '');

  const scored = [];
  for (const p of loadIndex()) {
    if (cat && !norm(p.category).includes(cat) && !norm(p.title).includes(cat)) continue;
    const hay = norm(`${p.title} ${p.brand} ${p.model} ${p.category} ${p.slug}`);
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += t.length > 3 ? 3 : 1;
    }
    if (score <= 0) continue;
    scored.push({ score, p });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ p }) => ({
    nombre: p.title,
    marca: p.brand || '',
    modelo: p.model || '',
    precio: p.price || '',
    categoria: p.category || '',
    url: `${site}/tienda/${p.slug}`,
  }));
}

/**
 * Recomendación orientativa (no inventa precio cerrado de instalación).
 */
export function recommendProject({ consumoMensual, tipoTecho, ubicacion, objetivo }) {
  const site = String(process.env.WHATSAPP_SITE_URL || 'https://reikisolar.com.co').replace(/\/$/, '');
  const consumo = String(consumoMensual || '').trim();
  const lugar = String(ubicacion || 'Colombia').trim();
  const techo = String(tipoTecho || 'por confirmar').trim();
  const obj = String(objetivo || 'ahorro').toLowerCase();

  let tipoSistema = 'on-grid (conectado a la red) para reducir la factura';
  if (/respaldo|corte|hibrido|híbrido|bateria|batería/.test(obj)) {
    tipoSistema = 'híbrido con batería (ahorro + respaldo ante cortes)';
  } else if (/finca|off|sin red|aislad/.test(obj)) {
    tipoSistema = 'off-grid / aislado (sin red o autonomía alta)';
  }

  return {
    ok: true,
    resumen:
      `Para ${lugar}, con consumo/factura "${consumo || 'por confirmar'}" y techo "${techo}", ` +
      `la ruta más sensata suele ser un sistema *${tipoSistema}*. ` +
      `El dimensionamiento exacto (paneles + inversor + batería si aplica) lo cierra un asesor con visita/datos de techo.`,
    siguientes_pasos: [
      'Confirmar factura o kWh mensuales',
      'Revisar tipo de techo y espacio disponible',
      'Cotización formal con un asesor Reiki',
    ],
    links_utiles: {
      tienda: `${site}/tienda`,
      paneles: `${site}/tienda/categoria/paneles-solares`,
      inversores: `${site}/tienda/categoria/inversores`,
      baterias: `${site}/tienda/categoria/baterias-de-litio`,
    },
    nota: 'No entregues un precio cerrado de instalación sin asesor; ofrece rangos solo si el cliente insiste y aclara que son orientativos.',
  };
}
