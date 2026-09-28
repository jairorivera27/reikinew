/**
 * Catálogo WhatsApp: índice enriquecido + detección de intención de compra.
 * Búsqueda: stopwords, categoría obligatoria, kW ≠ kWh, umbral de relevancia.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendList, sendText, sendButtons, sendImage, sendCtaUrl, getWhatsAppConfig } from './whatsapp.js';
import { isPrecioFinal } from './iva.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {object[] | null} */
let cache = null;

const STOPWORDS = new Set([
  'un',
  'una',
  'unos',
  'unas',
  'el',
  'la',
  'los',
  'las',
  'de',
  'del',
  'al',
  'a',
  'en',
  'por',
  'para',
  'con',
  'sin',
  'que',
  'me',
  'te',
  'se',
  'mi',
  'tu',
  'su',
  'y',
  'o',
  'u',
  'es',
  'son',
  'hay',
  'tiene',
  'tienen',
  'quiero',
  'necesito',
  'busco',
  'cotizar',
  'cotizame',
  'cotízame',
  'cotizacion',
  'cotización',
  'precio',
  'precios',
  'cuesta',
  'cuestan',
  'cuanto',
  'cuánto',
  'vale',
  'ver',
  'mostrar',
  'muestrame',
  'muéstrame',
  'dame',
  'pasa',
  'pasame',
  'pásame',
  'equipo',
  'equipos',
  'producto',
  'productos',
  'solar',
  'solares',
  'por',
  'favor',
  'hola',
  'buenas',
]);

const CATEGORY_HINTS = [
  { id: 'paneles', re: /\b(panel|paneles|modulo|módulo|modulos)\b/ },
  { id: 'inversores', re: /\b(inversor|inversores|microinversor|microinversores|inverter)\b/ },
  { id: 'baterias', re: /\b(bateria|baterias|batería|baterías|litio|lifepo4|kwh)\b/ },
  { id: 'controladores', re: /\b(controlador|controladores|mppt|pwm)\b/ },
  { id: 'protecciones', re: /\b(breaker|breakers|protector|proteccion|protecciones|dps|fusible|seccionador)\b/ },
  { id: 'reflectores', re: /\b(reflector|reflectores|luminaria|luminarias|lampara|lámpara)\b/ },
  { id: 'bombeo', re: /\b(bomba|bombas|bombeo)\b/ },
  {
    id: 'accesorios',
    re: /\b(cable|cables|conector|estructura|medidor|datalogger|dongle|optimizador|accesorio)\b/,
  },
];

const INVERTER_TYPES = [
  { id: 'hibrido', title: 'Híbrido', re: /\bhibrid/ },
  { id: 'on-grid', title: 'On-grid', re: /\b(on[\s-]?grid|conectado|red)\b/ },
  { id: 'off-grid', title: 'Off-grid', re: /\b(off[\s-]?grid|aislad|sin red)\b/ },
  { id: 'micro', title: 'Microinversor', re: /\bmicro/ },
];

const MIN_SCORE = 4;

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
  const categoria = p.category || '';
  const precioFinal = isPrecioFinal({ categoria, nombre: p.title });
  return {
    id: p.sku || p.slug,
    slug: p.slug,
    sku: p.sku || '',
    nombre: p.title,
    marca: p.brand || '',
    modelo: p.model || '',
    precio: p.price || '',
    precioNum: parsePriceCop(p.price),
    categoria,
    precioFinal,
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

export function detectCategoryFromQuery(query) {
  const n = norm(query);
  for (const h of CATEGORY_HINTS) {
    if (h.re.test(n)) return h.id;
  }
  // Potencia sin categoría explícita: kWh → baterías; kW/W alto → inversores; W panel típico → paneles
  if (/\b\d+(?:[.,]\d+)?\s*k\s*w\s*h\b/.test(n)) return 'baterias';
  if (/\b\d+(?:[.,]\d+)?\s*k\s*w\b/.test(n)) return 'inversores';
  if (/\b([5-9]\d{2}|[1-9]\d{3})\s*w\b/.test(n)) return 'paneles';
  return '';
}

export function detectInverterType(query) {
  const n = norm(query);
  for (const t of INVERTER_TYPES) {
    if (t.re.test(n)) return t.id;
  }
  return '';
}

/** Extrae potencia pedida: { value, unit: 'w'|'kw'|'kwh' } */
export function extractPowerQuery(query) {
  const n = norm(query);
  const mKwh = n.match(/(\d+(?:[.,]\d+)?)\s*k\s*w\s*h\b/);
  if (mKwh) {
    return { value: parseFloat(mKwh[1].replace(',', '.')), unit: 'kwh' };
  }
  const mKw = n.match(/(\d+(?:[.,]\d+)?)\s*k\s*w\b/);
  if (mKw) {
    return { value: parseFloat(mKw[1].replace(',', '.')), unit: 'kw' };
  }
  const mW = n.match(/(\d{2,4})\s*w\b/);
  if (mW) {
    return { value: parseFloat(mW[1]), unit: 'w' };
  }
  return null;
}

function productPowerInfo(p) {
  const hay = norm(`${p.power || ''} ${p.title || ''} ${(p.specifications || []).join(' ')}`);
  const mKwh = hay.match(/(\d+(?:[.,]\d+)?)\s*k\s*w\s*h\b/);
  if (mKwh) return { value: parseFloat(mKwh[1].replace(',', '.')), unit: 'kwh' };
  const mKw = hay.match(/(\d+(?:[.,]\d+)?)\s*k\s*w\b/);
  if (mKw) return { value: parseFloat(mKw[1].replace(',', '.')), unit: 'kw' };
  const mW = hay.match(/(\d{2,4})\s*w\b/);
  if (mW) return { value: parseFloat(mW[1]), unit: 'w' };
  return null;
}

function powerCompatible(wanted, got) {
  if (!wanted) return true;
  if (!got) return false;
  if (wanted.unit === 'kwh') {
    if (got.unit !== 'kwh') return false;
    return Math.abs(got.value - wanted.value) <= Math.max(0.6, wanted.value * 0.25);
  }
  if (wanted.unit === 'kw') {
    if (got.unit === 'kwh') return false;
    if (got.unit === 'kw') return Math.abs(got.value - wanted.value) <= 0.6;
    if (got.unit === 'w') return Math.abs(got.value / 1000 - wanted.value) <= 0.6;
  }
  if (wanted.unit === 'w') {
    if (got.unit === 'kwh') return false;
    if (got.unit === 'w') return Math.abs(got.value - wanted.value) <= 50;
    if (got.unit === 'kw') return Math.abs(got.value * 1000 - wanted.value) <= 50;
  }
  return false;
}

function tokenizeQuery(query) {
  const n = norm(query);
  return n
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * @param {string} query
 * @param {{ category?: string, limit?: number, inverterType?: string }} [opts]
 * @returns {object[] | { needsInverterType: true, query: string }}
 */
export function searchProducts(query, opts = {}) {
  const q = norm(query);
  if (!q) return [];

  const category = norm(opts.category || detectCategoryFromQuery(query));
  const powerWanted = extractPowerQuery(query);
  const invType = opts.inverterType || detectInverterType(query);
  const tokens = tokenizeQuery(query);
  const limit = Math.min(opts.limit || 10, 10);

  // Sin categoría clara → no inventar resultados
  if (!category && !opts.category) {
    return [];
  }

  // Inversor sin tipo (híbrido/on-grid/off-grid/micro) → pedir aclaración
  if (category === 'inversores' && !invType && !opts.skipTypeAsk) {
    return { needsInverterType: true, query: String(query || '') };
  }

  const scored = [];
  for (const p of loadIndex()) {
    const pCat = norm(p.category || '');
    if (category && pCat !== category && !pCat.includes(category)) continue;

    if (invType && category === 'inversores') {
      const hay = norm(`${p.title} ${(p.specifications || []).join(' ')} ${p.model}`);
      const typeOk = INVERTER_TYPES.find((t) => t.id === invType);
      if (typeOk && !typeOk.re.test(hay) && invType !== 'on-grid') {
        // on-grid: también aceptar si no dice híbrido/off/micro
        continue;
      }
      if (invType === 'on-grid') {
        if (/\bhibrid|off[\s-]?grid|micro/.test(hay) && !/\bon[\s-]?grid|conectado/.test(hay)) {
          continue;
        }
      }
    }

    const pPower = productPowerInfo(p);
    if (powerWanted && !powerCompatible(powerWanted, pPower)) continue;

    const hay = norm(
      `${p.title} ${p.brand} ${p.model} ${p.category} ${p.slug} ${p.sku} ${p.power} ${(p.specifications || []).join(' ')}`
    );
    let score = 0;
    if (category && pCat === category) score += 3;
    for (const t of tokens) {
      if (hay.includes(t)) score += t.length > 3 ? 3 : 2;
      if (norm(p.sku) === t || norm(p.model) === t) score += 12;
      if (norm(p.brand) === t) score += 5;
    }
    if (powerWanted && pPower && powerCompatible(powerWanted, pPower)) score += 6;
    if (score < MIN_SCORE) continue;
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
export async function sendProductSearchList(to, query, cfg = getWhatsAppConfig(), opts = {}) {
  const result = searchProducts(query, { limit: 10, ...opts });

  if (result && result.needsInverterType) {
    await sendButtons({
      to,
      body:
        'Con mucho gusto. Para mostrarte el inversor correcto, ¿de qué tipo lo necesitas, por favor?',
      buttons: [
        { id: 'inv_tipo:hibrido', title: 'Híbrido' },
        { id: 'inv_tipo:on-grid', title: 'On-grid' },
        { id: 'inv_tipo:off-grid', title: 'Off-grid' },
      ],
      cfg,
    });
    // Guardar query pendiente vía sesión (import dinámico p/ evitar ciclos)
    try {
      const { getSession, saveSession } = await import('./whatsapp-session.js');
      const s = await getSession(to);
      s.data.pendingInvQuery = String(query || '').slice(0, 200);
      await saveSession(to, s);
    } catch {
      /* optional */
    }
    return { encontrados: 0, needsInverterType: true };
  }

  const items = Array.isArray(result) ? result : [];
  if (!items.length) {
    await sendText({
      to,
      body:
        'No encontré ese equipo en la tienda con ese texto. Prueba marca + potencia (ej. *inversor híbrido felicity 5kW*) o escribe *menú*.',
      cfg,
    });
    return { encontrados: 0 };
  }

  const rows = items.map((p) => ({
    id: `prod:${p.slug}`,
    title: trunc(p.nombre, 24),
    description: trunc(
      `${p.precio}${p.precioFinal ? '' : ' + IVA'}${p.marca ? ` · ${p.marca}` : ''}`,
      72
    ),
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
  const ivaTag = p.precioFinal ? '' : ' _(+ IVA)_';
  const caption =
    `*${p.nombre}*\n` +
    `Precio: *${p.precio}*${ivaTag}` +
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

  await sendButtons({
    to,
    body: '¿Lo agregamos a tu cotización?',
    buttons: [
      { id: `cart_add:${p.slug}`, title: 'Agregar' },
      { id: 'cart_other', title: 'Ver otro' },
      { id: 'menu_asesor', title: 'Hablar ingeniero' },
    ],
    cfg,
  });
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

  const hsp = /medell|envigad|bello|itagui|sabaneta|rionegro|antioquia/i.test(lugar)
    ? 4.5
    : /cartagena|barranquilla|santa marta|valledupar|monteria|sincelejo|costa/i.test(lugar)
      ? 5.0
      : 4.0;
  const pr = 0.78;
  const TARIFA_COP_KWH = 800;
  let kwh = null;
  const mKwh = consumoRaw.match(/([\d.,]+)\s*k\s*w\s*h/i);
  if (mKwh) {
    kwh = parseFloat(mKwh[1].replace(/\./g, '').replace(',', '.'));
  } else {
    const digits = consumoRaw.replace(/[^\d]/g, '');
    if (digits.length >= 3) {
      const pesos = Number(digits);
      if (pesos > 50_000) kwh = pesos / TARIFA_COP_KWH;
      else if (pesos > 50 && pesos < 50_000) kwh = pesos;
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
      (rangoTxt ? `Como orientación, te alcanzaría ${rangoTxt}. ` : '') +
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
    precioFinal: p.precioFinal,
    link: p.url,
    marca: p.marca,
    categoria: p.categoria,
  }));
}
