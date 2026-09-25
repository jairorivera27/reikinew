/**
 * Catálogo WhatsApp: índice enriquecido + detección de intención de compra.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendList, sendText, sendButtons, sendImage, sendCtaUrl, getWhatsAppConfig } from './whatsapp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {object[] | null} */
let cache = null;

function siteUrl() {
  return String(process.env.WHATSAPP_SITE_URL || 'https://reikisolar.com.co').replace(/\/$/, '');
}

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

export function parsePriceCop(priceStr) {
  const digits = String(priceStr || '').replace(/[^\d]/g, '');
  return Number(digits) || 0;
}

export function formatPriceCop(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
}

/** URL pública https con espacios/tildes codificados. */
export function publicImageUrl(imagePath) {
  const raw = String(imagePath || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      u.pathname = u.pathname
        .split('/')
        .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
        .join('/');
      return u.toString();
    } catch {
      return raw;
    }
  }
  const pathPart = raw.startsWith('/') ? raw : `/${raw}`;
  const encoded = pathPart
    .split('/')
    .map((seg) => (seg ? encodeURIComponent(seg) : ''))
    .join('/');
  return `${siteUrl()}${encoded}`;
}

function mapProduct(p) {
  const site = siteUrl();
  const specs = Array.isArray(p.specifications) ? p.specifications.slice(0, 4) : [];
  return {
    id: p.sku || p.slug,
    slug: p.slug,
    sku: p.sku || '',
    nombre: p.title,
    marca: p.brand || '',
    modelo: p.model || '',
    precio: p.price || '',
    precioNum: parsePriceCop(p.price),
    categoria: p.category || '',
    power: p.power || '',
    stock: p.stock || '',
    specs,
    imagen: publicImageUrl(p.image),
    url: `${site}/tienda/${p.slug}`,
  };
}

/** Detecta intención de buscar equipos (sin IA). */
export function looksLikeCatalogQuery(text) {
  const n = norm(text);
  if (!n || n.length < 2) return false;
  if (
    /^(hola|buenas|menu|inicio|bot|asesor|ingeniero|humano|persona|pago|pagar|gracias)\b/.test(n)
  ) {
    return false;
  }
  return (
    /\b(panel|paneles|inversor|inversores|bateria|baterias|batería|baterías|litio|controlador|mppt|breaker|breakers|protector|proteccion|protecciones|microinversor|cable|conector|estructura|bomba|bombeo|reflector|cargador|medidor|datalogger|victron|growatt|huawei|deye|goodwe|felicity|must|pylon|longi|jinko|ja\s*solar|hoymiles|schletter)\b/.test(
      n
    ) ||
    /\b\d+\s*(w|kw|kwh|ah|v|va|watt)\b/.test(n) ||
    /\b(sku|ref\.?|modelo)\b/.test(n)
  );
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
  const limit = Math.min(opts.limit || 10, 10);

  const scored = [];
  for (const p of loadIndex()) {
    if (cat && !norm(p.category).includes(cat) && !norm(p.title).includes(cat)) continue;
    const hay = norm(
      `${p.title} ${p.brand} ${p.model} ${p.category} ${p.slug} ${p.sku} ${p.power} ${(p.specifications || []).join(' ')}`
    );
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += t.length > 3 ? 3 : 1;
      if (norm(p.sku) === t) score += 12;
    }
    if (score <= 0) continue;
    scored.push({ score, p });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ p }) => mapProduct(p));
}

export function getProductById(id) {
  const key = norm(id);
  if (!key) return null;
  for (const p of loadIndex()) {
    if (norm(p.slug) === key || norm(p.sku) === key) return mapProduct(p);
  }
  return null;
}

function trunc(s, n) {
  const t = String(s || '').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

/**
 * Lista interactiva hasta 10 productos (nombre + precio). Sin IA.
 */
export async function sendProductSearchList(to, query, cfg = getWhatsAppConfig()) {
  const items = searchProducts(query, { limit: 10 });
  if (!items.length) {
    await sendText({
      to,
      body:
        'No encontré ese equipo en la tienda con ese texto. Prueba marca + potencia (ej. *inversor felicity 5kW*) o escribe *menú*.',
      cfg,
    });
    return { encontrados: 0 };
  }

  const rows = items.map((p) => ({
    id: `prod:${p.slug}`,
    title: trunc(p.nombre, 24),
    description: trunc(`${p.precio}${p.marca ? ` · ${p.marca}` : ''}`, 72),
  }));

  await sendList({
    to,
    body: `Encontré *${items.length}* opción(es) para «${trunc(query, 40)}». Elige una:`,
    buttonText: 'Ver equipos',
    sections: [{ title: 'Catálogo', rows }],
    cfg,
  });
  return { encontrados: items.length, items };
}

/**
 * Detalle de un producto + botones de carrito.
 */
export async function sendProductDetail(to, product, cfg = getWhatsAppConfig()) {
  const p = typeof product === 'string' ? getProductById(product) : product;
  if (!p) {
    await sendText({ to, body: 'Ese producto ya no está disponible. Busca de nuevo o escribe *menú*.', cfg });
    return false;
  }
  const specsLine = (p.specs || []).slice(0, 2).join(' · ');
  const caption =
    `*${p.nombre}*\n` +
    `Precio: *${p.precio}*` +
    (p.stock ? ` · ${p.stock}` : '') +
    (specsLine ? `\n${specsLine}` : '') +
    (p.power ? `\n${p.power}` : '') +
    `\n${p.url}`;

  let sentImage = false;
  if (p.imagen) {
    try {
      await sendImage({ to, link: p.imagen, caption, cfg });
      sentImage = true;
    } catch (err) {
      console.warn('[whatsapp-catalog] imagen falló', p.slug, err?.message || err);
    }
  }
  if (!sentImage) await sendText({ to, body: caption, cfg });

  try {
    await sendButtons({
      to,
      body: '¿Qué hacemos con este equipo?',
      buttons: [
        { id: `cart_add:${p.slug}`, title: 'Agregar a cotiz.' },
        { id: 'cart_other', title: 'Ver otra opción' },
        { id: 'cart_view', title: 'Ver mi cotización' },
      ],
      cfg,
    });
  } catch (err) {
    console.warn('[whatsapp-catalog] botones', err?.message || err);
    try {
      await sendCtaUrl({ to, body: 'Ver en la tienda:', displayText: 'Ver en tienda', url: p.url, cfg });
    } catch {
      /* ignore */
    }
  }
  return true;
}

export function recommendProject({ consumoMensual, tipoTecho, ubicacion, objetivo }) {
  const site = siteUrl();
  const consumoRaw = String(consumoMensual || '').trim();
  const lugar = String(ubicacion || 'Colombia').trim();
  const techo = String(tipoTecho || 'por confirmar').trim();
  const obj = String(objetivo || 'ahorro').toLowerCase();

  let tipoSistema = 'on-grid (conectado a la red) para reducir la factura';
  if (/respaldo|corte|hibrido|híbrido|bateria|batería|ambos/.test(obj)) {
    tipoSistema = 'híbrido con batería (ahorro + respaldo ante cortes)';
  } else if (/finca|off|sin red|aislad/.test(obj)) {
    tipoSistema = 'off-grid / aislado (sin red o autonomía alta)';
  }

  // kWp = kWh_mes / (30 × HSP × PR); PR=0,78. HSP por zona (default 4,0).
  const hsp = /medell|envigad|bello|itagui|sabaneta|rionegro|antioquia/i.test(lugar)
    ? 4.5
    : /cartagena|barranquilla|santa marta|valledupar|monteria|sincelejo|costa/i.test(lugar)
      ? 5.0
      : 4.0;
  const pr = 0.78;
  const TARIFA_COP_KWH = 800; // aproximación si solo dan valor de factura
  let kwh = null;
  const mKwh = consumoRaw.match(/([\d.,]+)\s*k\s*w\s*h/i);
  if (mKwh) {
    kwh = parseFloat(mKwh[1].replace(/\./g, '').replace(',', '.'));
  } else {
    const digits = consumoRaw.replace(/[^\d]/g, '');
    if (digits.length >= 3) {
      const pesos = Number(digits);
      if (pesos > 50_000) kwh = pesos / TARIFA_COP_KWH;
      else if (pesos > 50 && pesos < 50_000) kwh = pesos; // ya parece kWh
    }
  }

  let kwpMin = null;
  let kwpMax = null;
  let rangoTxt = '';
  if (kwh && kwh > 0) {
    const kwp = kwh / (30 * hsp * pr);
    kwpMin = Math.max(0.5, Math.round(kwp * 0.9 * 10) / 10);
    kwpMax = Math.round(kwp * 1.2 * 10) / 10;
    rangoTxt = `un sistema de aproximadamente *${String(kwpMin).replace('.', ',')} a ${String(kwpMax).replace('.', ',')} kWp*`;
  }

  return {
    ok: true,
    kwp_min: kwpMin,
    kwp_max: kwpMax,
    hsp,
    pr,
    kwh_estimado: kwh,
    resumen:
      `Para ${lugar}, con consumo/factura "${consumoRaw || 'por confirmar'}" y techo "${techo}", ` +
      `la ruta más sensata suele ser un sistema *${tipoSistema}*. ` +
      (rangoTxt
        ? `Como orientación, te alcanzaría ${rangoTxt}. `
        : '') +
      `El dimensionamiento exacto lo cierra nuestro ingeniero experto en diseño fotovoltaico (sin costo).`,
    siguientes_pasos: [
      'Confirmar factura o kWh mensuales',
      'Revisar tipo de techo y espacio',
      'Diseño final con el ingeniero',
    ],
    links_utiles: {
      tienda: `${site}/tienda`,
      paneles: `${site}/tienda/categoria/paneles-solares`,
      inversores: `${site}/tienda/categoria/inversores`,
      baterias: `${site}/tienda/categoria/baterias-de-litio`,
    },
    nota: 'No des precio cerrado de instalación; ofrece rangos solo si insiste y aclara que son orientativos.',
  };
}

/** Recorte para tool results hacia Claude */
export function trimProductsForAi(items, limit = 5) {
  return (items || []).slice(0, limit).map((p) => ({
    nombre: p.nombre,
    precio: p.precio,
    link: p.url,
    specs: (p.specs || []).slice(0, 2),
  }));
}
