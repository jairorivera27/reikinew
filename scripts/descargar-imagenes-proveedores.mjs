/**
 * DESCARGAR (solo) imágenes de proveedor → imagenes-proveedores/
 * NO toca public/, datos de producto ni imagenes-originales/.
 * NO procesa ni publica.
 *
 * Uso:
 *   node scripts/descargar-imagenes-proveedores.mjs
 *   node scripts/descargar-imagenes-proveedores.mjs --limit 30
 *   node scripts/descargar-imagenes-proveedores.mjs --brand Victron
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROD = path.join(ROOT, 'src', 'content', 'productos');
const OUT = path.join(ROOT, 'imagenes-proveedores');
const MANIFEST = path.join(OUT, 'manifest.csv');
const ERRORES = path.join(OUT, 'errores.csv');
const RESUMEN = path.join(OUT, 'resumen.md');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const AUTOSOLAR_BRANDS = new Set(
  ['victron', 'growatt', 'tensite', 'ja solar', 'jasolar', 'pylontech'].map((s) => s.toLowerCase())
);
const SOLAIRE_BRANDS = new Set(
  [
    'huawei',
    'hoymiles',
    'apsystems',
    'pytes',
    'jinko',
    'longi',
    'solis',
    'sungrow',
    'solax',
    'accuenergy',
  ].map((s) => s.toLowerCase())
);

const AUTOSOLAR_CATEGORIES = [
  'controladores-de-carga-mppt',
  'controladores-de-carga-pwm',
  'inversores-cargadores',
  'inversores-cargadores-12v',
  'inversores-cargadores-24v',
  'inversores-cargadores-48v',
  'inversores-on-grid',
  'inversores-on-grid-monofasicos',
  'inversores-on-grid-trifasicos',
  'inversores-off-grid',
  'baterias-de-litio',
  'baterias-de-litio-12v',
  'baterias-de-litio-24v',
  'baterias-de-litio-48v',
  'paneles-solares-12v',
  'paneles-solares-24v',
  'microinversores',
];

/** @type {{ url: string, slug: string, cat: string }[] | null} */
let autosolarIndex = null;

const SHARED_ORIG_BASENAMES = [
  'victron-smartsolar-mppt',
  'generic-mcb-ac',
  'goodwe-sdt',
  'victron-multiplus',
  'huawei-sun2000',
  'growatt-mod',
  'victron-phoenix',
  'apsystems-ds3',
  'victron-quattro',
  'goodwe-ezlogger',
  'goodwe-es',
  'felicity-fla24',
  'felicity-fla48',
  'kolos3-sumergible',
  'kolos4-sumergible',
  'felicity-hybrid',
  'hoymiles-hms',
  'pylontech-uf5000',
  'huawei-luna',
  'pytes-battery',
  'suntree-spd-ac',
  'must-pv',
  'deye-hybrid',
  'reflector led solar 200W',
  'pylontech-3kwh',
  'pylontech-us',
  'felicity-12v',
  'goodwe-lynxl',
  'growatt-ark',
  'kolos-pool',
];

const LAST_REQ = { autosolar: 0, solaire: 0 };

function parseArgs() {
  const out = { limit: 0, brand: '' };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--limit') out.limit = Number(process.argv[++i]) || 0;
    else if (process.argv[i] === '--brand') out.brand = String(process.argv[++i] || '');
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rateLimit(site) {
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - (LAST_REQ[site] || 0)));
  if (wait) await sleep(wait);
  LAST_REQ[site] = Date.now();
}

function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[mm[1]] = v;
  }
  return out;
}

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function slugify(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'modelo';
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function brandKey(b) {
  return String(b || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function providersFor(brand) {
  const b = brandKey(brand);
  const out = [];
  if (AUTOSOLAR_BRANDS.has(b) || AUTOSOLAR_BRANDS.has(b.replace(/\s/g, ''))) out.push('autosolar');
  if (SOLAIRE_BRANDS.has(b)) out.push('solaire');
  // dual brands
  if (b === 'ja solar' || b === 'jasolar') {
    if (!out.includes('autosolar')) out.push('autosolar');
  }
  return out;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function stripWpSize(u) {
  return u.replace(/-\d+x\d+(?=\.(?:png|jpe?g|webp))/i, '');
}

function stripAutosolarThumb(u) {
  return u.replace(/-thumb(?=\.(?:png|jpe?g|webp))/i, '');
}

function extractUrls(html) {
  return [
    ...new Set(
      [...html.matchAll(/https?:\/\/[^"'\\\s>]+\.(?:png|jpe?g|webp|gif|pdf)/gi)].map((m) =>
        m[0].replace(/&amp;/g, '&')
      )
    ),
  ];
}

function isMarketing(u) {
  return /banner|slider|hero|kit[-_]?completo|promo|marketing|logo|icon|favicon|avatar|cropped-logo|placeholder|sprite/i.test(
    u
  );
}

function rankProductUrls(urls, product) {
  const tokens = [product.brand, product.model, product.sku]
    .filter(Boolean)
    .map((t) => norm(t))
    .filter((t) => t.length >= 3);
  return [...urls].sort((a, b) => {
    const score = (u) => {
      const n = norm(u);
      let s = 0;
      for (const t of tokens) if (n.includes(t)) s += Math.min(t.length, 20);
      if (/kit/i.test(u)) s -= 50;
      return s;
    };
    return score(b) - score(a);
  });
}

async function searchSolaire(query) {
  await rateLimit('solaire');
  const url = `https://portal.solaire.com.co/?s=${encodeURIComponent(query)}&post_type=product`;
  const html = await fetchHtml(url);
  const links = [
    ...html.matchAll(/https?:\/\/portal\.solaire\.com\.co\/producto\/[a-z0-9-]+\/?/gi),
  ].map((m) => m[0].replace(/\/?$/, '/'));
  return { searchUrl: url, productUrls: [...new Set(links)].slice(0, 10) };
}

async function loadSolaireProduct(productUrl) {
  await rateLimit('solaire');
  const html = await fetchHtml(productUrl);
  const title =
    (html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([^<]+)/i) ||
      html.match(/<title>([^<]+)/i) ||
      [])[1]?.trim() || '';
  const urls = extractUrls(html);
  const imgs = [
    ...new Set(
      urls
        .filter((u) => /\.(png|jpe?g|webp)/i.test(u))
        .filter((u) => !isMarketing(u))
        .map(stripWpSize)
        .filter((u) => /\/uploads\//i.test(u))
    ),
  ].slice(0, 8);
  const pdfs = urls.filter((u) => /\.pdf/i.test(u));
  return { productUrl, title, images: imgs, pdfs };
}

async function searchAutosolar(query) {
  // Prestashop search is unreliable; prefer category index. Keep as fallback.
  await rateLimit('autosolar');
  const url = `https://autosolar.co/busqueda?controller=search&s=${encodeURIComponent(query)}`;
  try {
    const html = await fetchHtml(url);
    const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
    const all = [
      ...new Set(
        hrefs
          .map((u) => u.split('?')[0].replace(/\/$/, ''))
          .filter((u) => /^https?:\/\/(?:www\.)?autosolar\.co\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(u))
          .filter((u) => !/kit|fabricantes|account|blog|cart|busqueda/i.test(u))
      ),
    ].slice(0, 12);
    return { searchUrl: url, productUrls: all };
  } catch {
    return { searchUrl: url, productUrls: [] };
  }
}

async function buildAutosolarIndex() {
  if (autosolarIndex) return autosolarIndex;
  const cachePath = path.join(OUT, '_autosolar-index.json');
  if (fs.existsSync(cachePath) && !process.argv.includes('--reindex')) {
    try {
      autosolarIndex = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      console.log(`Índice Autosolar (cache): ${autosolarIndex.length} productos`);
      return autosolarIndex;
    } catch {
      /* rebuild */
    }
  }
  const seen = new Map();
  console.log('Indexando categorías Autosolar…');
  for (const cat of AUTOSOLAR_CATEGORIES) {
    for (let page = 1; page <= 4; page++) {
      const url =
        page === 1
          ? `https://autosolar.co/${cat}`
          : `https://autosolar.co/${cat}?page=${page}`;
      try {
        await rateLimit('autosolar');
        const html = await fetchHtml(url);
        const title = (html.match(/<title>([^|<]+)/i) || [])[1]?.trim() || '';
        if (/^Autosolar$/i.test(title) && page > 1) break;
        const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
        let added = 0;
        for (const raw of hrefs) {
          const u = raw.split('?')[0].replace(/\/$/, '');
          if (!/^https?:\/\/(?:www\.)?autosolar\.co\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(u)) continue;
          if (/kit|fabricantes|account|blog|cart|busqueda/i.test(u)) continue;
          // prefer URLs under this category
          if (!u.includes(`/${cat}/`) && page === 1) {
            // still keep brand-relevant orphans
            if (!/victron|growatt|pylon|tensite|ja-solar|smartsolar|multiplus|phoenix|quattro|bluesolar|ark/i.test(u))
              continue;
          }
          if (!seen.has(u)) {
            seen.set(u, { url: u, slug: u.split('/').pop(), cat });
            added++;
          }
        }
        console.log(`  ${cat} p${page}: +${added} (total ${seen.size})`);
        if (added === 0 && page > 1) break;
        if (page === 1 && !html.match(/[?&]page=2/i)) break;
      } catch (e) {
        console.warn('  index fail', cat, page, e.message);
        break;
      }
    }
  }
  autosolarIndex = [...seen.values()];
  fs.writeFileSync(
    path.join(OUT, '_autosolar-index.json'),
    JSON.stringify(autosolarIndex, null, 2)
  );
  console.log(`Índice Autosolar: ${autosolarIndex.length} productos`);
  return autosolarIndex;
}

function decodeVictronScc(model) {
  const m = String(model || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  // SmartSolar: SCC1 + VVV + AA…
  let x = m.match(/^SCC1(\d{3})(\d{2})/);
  if (x) return { family: 'smartsolar', v: x[1].replace(/^0+/, '') || x[1], a: String(Number(x[2])) };
  // BlueSolar / other: SCC0 + VVV + AA… or SCC075010060
  x = m.match(/^SCC0(\d{3})(\d{2})/);
  if (x) return { family: 'bluesolar', v: x[1].replace(/^0+/, '') || x[1], a: String(Number(x[2])) };
  x = m.match(/^SCC(\d{2,3})(\d{2})/);
  if (x) return { family: 'mppt', v: String(Number(x[1])), a: String(Number(x[2])) };
  return null;
}

function matchAutosolarFromIndex(product, index) {
  const brand = norm(product.brand);
  const model = norm(product.model || product.sku || '');
  const titleN = norm(product.title);
  const powerN = norm(product.power || '');
  const scc = /VICTRON/i.test(product.brand || '') ? decodeVictronScc(product.model || product.sku || '') : null;
  const scored = [];
  for (const item of index) {
    const hay = norm(item.slug + ' ' + item.url);
    if (brand === 'VICTRON' && !/VICTRON|SMARTSOLAR|BLUESOLAR|MULTIPLUS|PHOENIX|QUATTRO/.test(hay)) continue;
    if (brand && brand !== 'VICTRON' && brand !== 'JASOLAR' && !hay.includes(brand)) {
      if (!(brand === 'JASOLAR' && /JASOLAR|JASOLAR|JA/.test(hay))) continue;
    }

    let score = 0;
    let match = null;

    if (scc) {
      const token = `${scc.v}${scc.a}`;
      const token2 = `${scc.v}-${scc.a}`;
      if (hay.includes(norm(token)) || item.slug.includes(token) || item.slug.includes(token2)) {
        score += 120;
        match = 'exacto';
      } else if (hay.includes(norm(scc.family)) || hay.includes('SMARTSOLAR') || hay.includes('BLUESOLAR')) {
        // same family MPPT, different size
        if (product.category === 'controladores') {
          score += 40;
          match = 'serie';
        }
      }
    }

    if (model && model.length >= 5 && hay.includes(model)) {
      score += 100;
      match = 'exacto';
    }
    // SmartSolar 100/50 style in title
    const amp = `${product.model || ''} ${product.title || ''} ${product.power || ''}`.match(
      /(\d+)\s*\/\s*(\d+)/
    );
    if (amp) {
      const token = `${amp[1]}${amp[2]}`;
      if (hay.includes(norm(token)) || item.slug.includes(token)) {
        score += 80;
        match = match === 'exacto' ? 'exacto' : 'exacto';
      }
    }
    for (const tok of [
      'SMARTSOLAR',
      'BLUESOLAR',
      'MULTIPLUS',
      'PHOENIX',
      'QUATTRO',
      'US2000',
      'US3000',
      'US5000',
      'UF5000',
      'ARK',
      'MID',
      'MIN',
      'MOD',
      'TLX',
      'KTL',
    ]) {
      if (titleN.includes(tok) && hay.includes(tok)) {
        score += 25;
        match = match || 'serie';
      }
    }
    // Victron MultiPlus / Phoenix / Quattro by series name in our title
    if (/MULTIPLUS/i.test(product.title || '') && /multiplus/i.test(item.slug)) {
      score += 50;
      match = match || 'serie';
    }
    if (/PHOENIX/i.test(product.title || '') && /phoenix/i.test(item.slug)) {
      score += 50;
      match = match || 'serie';
    }
    if (/QUATTRO/i.test(product.title || '') && /quattro/i.test(item.slug)) {
      score += 50;
      match = match || 'serie';
    }

    if (powerN && powerN.length >= 3 && hay.includes(powerN)) score += 10;
    if (product.category === 'controladores' && /controlador/i.test(item.url)) score += 15;
    if (product.category === 'inversores' && /inversor/i.test(item.url)) score += 15;
    if (product.category === 'baterias' && /bateria/i.test(item.url)) score += 15;
    if (product.category === 'paneles' && /panel/i.test(item.url)) score += 15;
    if (product.category === 'baterias' && /inversor/i.test(item.url) && !/bateria/i.test(item.url))
      continue;
    if (product.category === 'inversores' && /bateria/i.test(item.url) && !/inversor/i.test(item.url))
      continue;
    if (score >= 25 && match) scored.push({ ...item, score, match });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

async function loadAutosolarProduct(productUrl) {
  await rateLimit('autosolar');
  const html = await fetchHtml(productUrl);
  const title =
    (html.match(/<h1[^>]*>\s*([^<]+)/i) || html.match(/<title>([^|<]+)/i) || [])[1]?.trim() || '';
  if (/^Autosolar$/i.test(title) || /La Tienda de la Energ/i.test(title)) {
    return { productUrl, title, images: [], pdfs: [], invalid: true };
  }
  const rawUrls = [
    ...html.matchAll(
      /https?:\/\/(?:cdn\.)?autosolar\.co\/images\/(\d+)\/([^"'\\\s>]+)\.(png|jpe?g|webp)/gi
    ),
  ].map((m) => ({
    id: m[1],
    url: `https://cdn.autosolar.co/images/${m[1]}/${m[2]
      .replace(/-thumb2x$/i, '')
      .replace(/-thumb$/i, '')
      .replace(/-2x$/i, '')}.${m[3]}`,
    raw: m[0],
  }));

  // pick dominant product image folder id (exclude tiny badges)
  const freq = {};
  for (const r of rawUrls) {
    if (/kit|logo|seguridad|grantia|garantia|envio|whatsapp|colombia-map|favicon/i.test(r.url))
      continue;
    freq[r.id] = (freq[r.id] || 0) + 1;
  }
  const topId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
  let imgs = rawUrls
    .filter((r) => r.id === topId)
    .map((r) => r.url)
    .filter((u) => !/kit|logo|seguridad|grantia|garantia|envio/i.test(u));
  imgs = [...new Set(imgs)].slice(0, 8);

  const pdfs = extractUrls(html).filter(
    (u) => /\.pdf/i.test(u) && /cdn\.autosolar|autosolar\.co\/pdf/i.test(u)
  );
  return { productUrl, title, images: imgs, pdfs, invalid: false };
}

function classifyMatch(product, pageTitle, pageUrl) {
  const hay = norm(pageTitle + ' ' + pageUrl);
  const model = norm(product.model || product.sku || '');
  const titleN = norm(product.title);
  const powerN = norm(product.power || '');

  if (!hay) return 'dudoso';

  // exact model
  if (model && model.length >= 5 && hay.includes(model)) {
    // power/voltage suffix conflict?
    if (powerN && powerN.length >= 3) {
      // e.g. 10050 vs 100A — if our power tokens appear differently
      const ourAmp = (product.power || product.title || '').match(/(\d+)\s*\/\s*(\d+)/);
      const theirAmp = (pageTitle || '').match(/(\d+)\s*\/\s*(\d+)/);
      if (ourAmp && theirAmp) {
        if (ourAmp[1] !== theirAmp[1] || ourAmp[2] !== theirAmp[2]) return 'dudoso';
      }
    }
    return 'exacto';
  }

  // series: brand + shared series token, different power
  const seriesTokens = [
    'SUN2000',
    'MULTIPLUS',
    'PHOENIX',
    'QUATTRO',
    'SMARTSOLAR',
    'BLUESOLAR',
    'HMS',
    'HMT',
    'DS3',
    'LUNA',
    'ARK',
    'UF5000',
    'US5000',
    'FLA24',
    'FLA48',
    'SDT',
    'MOD',
    'MIN',
    'MID',
  ];
  for (const tok of seriesTokens) {
    if (titleN.includes(tok) && hay.includes(tok)) {
      // same series token but model not exact
      if (model && !hay.includes(model)) return 'serie';
      return 'serie';
    }
  }

  // Victron SCC prefix family
  if (/^SCC/.test(model) && hay.includes('SCC') && /SMARTSOLAR|MPPT|BLUESOLAR|PWM/.test(hay)) {
    if (hay.includes(model)) return 'exacto';
    return 'serie';
  }

  // Growatt TL / KTL
  if (/GROWATT/.test(norm(product.brand)) && /GROWATT/.test(hay)) {
    if (model && hay.includes(model)) return 'exacto';
    return 'serie';
  }

  if (model && model.length >= 8) {
    // partial model overlap
    const core = model.slice(0, Math.min(10, model.length));
    if (hay.includes(core)) return 'dudoso';
  }

  return null; // no match
}

async function downloadFile(url, destAbs, site) {
  await rateLimit(site);
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destAbs, buf);
  return buf;
}

async function imageMeta(abs) {
  try {
    const meta = await sharp(abs, { failOn: 'none' }).metadata();
    let transparente = 'no';
    if (meta.hasAlpha) {
      const { data, info } = await sharp(abs)
        .ensureAlpha()
        .resize(48, 48, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      let clear = 0;
      for (let i = 3; i < data.length; i += info.channels) if (data[i] < 250) clear++;
      if (clear / (info.width * info.height) > 0.02) transparente = 'si';
    }
    return {
      ancho: meta.width || 0,
      alto: meta.height || 0,
      formato: meta.format || path.extname(abs).slice(1),
      transparente,
    };
  } catch {
    return { ancho: 0, alto: 0, formato: path.extname(abs).slice(1), transparente: 'no' };
  }
}

function collectTargets(args) {
  const noSirven = fs.existsSync(path.join(ROOT, 'docs', 'imagenes-no-sirven.md'))
    ? fs.readFileSync(path.join(ROOT, 'docs', 'imagenes-no-sirven.md'), 'utf8')
    : '';
  const targets = new Map();

  for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md'))) {
    const slug = f.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(PROD, f), 'utf8');
    const fm = parseFm(raw);
    const draft = String(fm.draft) === 'true';
    const provisional = String(fm.imagen_provisional) === 'true';
    const orig = fm.imageOriginal || '';
    const brand = fm.brand || '';
    const title = fm.title || slug;

    // already definitive?
    const definitive =
      !provisional &&
      !draft &&
      /productos-estudio\//.test(fm.image || '') &&
      !SHARED_ORIG_BASENAMES.some((b) => orig.toLowerCase().includes(b.toLowerCase()));

    const inNoSirven = noSirven.includes(slug);
    const inShared = SHARED_ORIG_BASENAMES.some((b) => orig.toLowerCase().includes(b.toLowerCase()));
    const isHiddenNeed =
      draft &&
      (/goodwe.*gw3000-xs|gm330|imagenPendiente/i.test(raw) ||
        String(fm.imagenPendiente) === 'true' ||
        /GW3000-XS-30|GM330/i.test(title + ' ' + (fm.model || '')));

    // Explicit drafts user asked: GW3000-XS-30, GM330
    const namedDraft =
      draft &&
      (/gw3000-xs-30|gm330/i.test(slug) || /GW3000-XS-30|GM330/i.test(title + (fm.model || '')));

    const need =
      (!definitive && (provisional || inNoSirven || inShared)) ||
      namedDraft ||
      (draft && String(fm.imagenPendiente) === 'true');

    if (!need) continue;
    if (args.brand && !brandKey(brand).includes(args.brand.toLowerCase())) continue;

    targets.set(slug, {
      slug,
      title,
      brand,
      model: fm.model || '',
      sku: fm.sku || '',
      power: fm.power || '',
      category: fm.category || '',
      draft,
      provisional,
      orig,
      providers: providersFor(brand),
    });
  }

  // ensure named drafts even if brand filter
  for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md'))) {
    const slug = f.replace(/\.md$/, '');
    if (!/gw3000-xs-30|gm330/i.test(slug)) continue;
    if (targets.has(slug)) continue;
    const fm = parseFm(fs.readFileSync(path.join(PROD, f), 'utf8'));
    targets.set(slug, {
      slug,
      title: fm.title || slug,
      brand: fm.brand || 'GoodWe',
      model: fm.model || '',
      sku: fm.sku || '',
      power: fm.power || '',
      category: fm.category || '',
      draft: true,
      provisional: false,
      orig: fm.imageOriginal || '',
      providers: providersFor(fm.brand || 'GoodWe'),
    });
  }

  let list = [...targets.values()];
  // priority: Autosolar brands first (Victron/Growatt/Pylontech), then Solaire
  list.sort((a, b) => {
    const score = (p) => {
      let s = 0;
      const b = brandKey(p.brand);
      if (['victron', 'growatt', 'pylontech'].includes(b)) s += 100;
      if (['huawei', 'hoymiles', 'apsystems', 'pytes'].includes(b)) s += 80;
      if (p.providers.includes('autosolar')) s += 10;
      if (p.providers.includes('solaire')) s += 5;
      return s;
    };
    return score(b) - score(a);
  });
  if (args.limit > 0) list = list.slice(0, args.limit);
  return list;
}

function appendCsv(file, header, row) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, header + '\n', 'utf8');
  }
  fs.appendFileSync(file, row.map(csvEscape).join(',') + '\n', 'utf8');
}

async function processProduct(p, stats, seenDownload) {
  const providers = p.providers.length ? p.providers : [];
  if (!providers.length) {
    stats.sinProveedor.push(p);
    return;
  }

  let anyMatch = false;

  for (const provider of providers) {
    let best = null;

    if (provider === 'autosolar') {
      const index = await buildAutosolarIndex();
      const candidates = matchAutosolarFromIndex(p, index);
      for (const cand of candidates) {
        try {
          const page = await loadAutosolarProduct(cand.url);
          if (page.invalid || !page.images.length) continue;
          const match =
            classifyMatch(p, page.title, page.productUrl) || cand.match || 'dudoso';
          // reject if page title brand clearly wrong
          const pageBrand = norm(page.title);
          const ourBrand = norm(p.brand);
          if (ourBrand && pageBrand && !pageBrand.includes(ourBrand) && ourBrand !== 'JASOLAR') {
            if (!(ourBrand === 'VICTRON' && /VICTRON/.test(pageBrand))) continue;
          }
          const rank = match === 'exacto' ? 3 : match === 'serie' ? 2 : 1;
          if (!best || rank > best.rank || (rank === best.rank && cand.score > (best.score || 0))) {
            best = { match, rank, page, score: cand.score };
          }
          if (match === 'exacto') break;
        } catch (e) {
          appendCsv(ERRORES, 'sku,proveedor,url,error', [p.slug, provider, cand.url, e.message]);
        }
      }
    } else {
      const queries = [];
      if (p.model) queries.push(`${p.brand} ${p.model}`.trim());
      if (p.sku && p.sku !== p.model) queries.push(`${p.brand} ${p.sku}`.trim());
      queries.push(`${p.brand} ${p.title}`.replace(/\s+/g, ' ').trim().slice(0, 80));

      for (const q of queries) {
        try {
          const search = await searchSolaire(q);
          const ranked = rankProductUrls(search.productUrls, p);
          for (const url of ranked.slice(0, 5)) {
            try {
              const page = await loadSolaireProduct(url);
              const match = classifyMatch(p, page.title, page.productUrl);
              if (!match) continue;
              const rank = match === 'exacto' ? 3 : match === 'serie' ? 2 : 1;
              if (!best || rank > best.rank) {
                best = { match, rank, page, query: q };
              }
              if (match === 'exacto') break;
            } catch (e) {
              appendCsv(ERRORES, 'sku,proveedor,url,error', [p.slug, provider, url, e.message]);
            }
          }
          if (best?.match === 'exacto') break;
        } catch (e) {
          appendCsv(ERRORES, 'sku,proveedor,url,error', [p.slug, provider, q, e.message]);
        }
      }
    }

    if (!best || !best.page?.images?.length) continue;
    anyMatch = true;
    const { page, match } = best;
    const marca = slugify(p.brand || 'sin-marca');
    const modelo = slugify(p.model || p.sku || p.slug);
    const dir = path.join(OUT, provider, marca, modelo);
    fs.mkdirSync(dir, { recursive: true });

    let idx = 0;
    for (const imgUrl of page.images) {
      idx++;
      const origName = path.basename(imgUrl.split('?')[0]);
      const ext = path.extname(origName) || '.jpg';
      const base = origName.replace(ext, '') || `img`;
      const localName = `${String(idx).padStart(2, '0')}-${base}${ext}`;
      const dest = path.join(dir, localName);
      const key = `${provider}|${imgUrl}`;
      try {
        if (!seenDownload.has(key)) {
          await downloadFile(imgUrl, dest, provider);
          seenDownload.set(key, dest);
        } else if (!fs.existsSync(dest)) {
          fs.copyFileSync(seenDownload.get(key), dest);
        }
        const meta = await imageMeta(dest);
        appendCsv(
          MANIFEST,
          'sku,producto,proveedor,url_origen,archivo_local,ancho,alto,formato,transparente,match,notas',
          [
            p.slug,
            p.title,
            provider,
            imgUrl,
            path.relative(ROOT, dest).replace(/\\/g, '/'),
            meta.ancho,
            meta.alto,
            meta.formato,
            meta.transparente,
            match,
            `page=${page.productUrl}`,
          ]
        );
        stats.byMatch[match] = (stats.byMatch[match] || 0) + 1;
        stats.skuMatch[p.slug] = stats.skuMatch[p.slug] || new Set();
        stats.skuMatch[p.slug].add(match);
      } catch (e) {
        appendCsv(ERRORES, 'sku,proveedor,url,error', [p.slug, provider, imgUrl, e.message]);
      }
    }

    // PDFs (Solaire preferred; also Autosolar if any)
    if (page.pdfs?.length) {
      const fichasDir = path.join(OUT, 'fichas');
      fs.mkdirSync(fichasDir, { recursive: true });
      for (const pdfUrl of page.pdfs.slice(0, 6)) {
        const low = pdfUrl.toLowerCase();
        let kind = 'ficha';
        if (/manual|usermanual|user-manual|instal/i.test(low)) kind = 'manual';
        else if (/garant|warranty/i.test(low)) kind = 'garantia';
        else if (/ficha|datasheet|spec|hoja/i.test(low)) kind = 'ficha';
        const dest = path.join(fichasDir, `${marca}-${modelo}-${kind}.pdf`);
        try {
          if (!fs.existsSync(dest)) await downloadFile(pdfUrl, dest, provider);
          appendCsv(
            MANIFEST,
            'sku,producto,proveedor,url_origen,archivo_local,ancho,alto,formato,transparente,match,notas',
            [
              p.slug,
              p.title,
              provider,
              pdfUrl,
              path.relative(ROOT, dest).replace(/\\/g, '/'),
              '',
              '',
              'pdf',
              'no',
              match,
              kind,
            ]
          );
        } catch (e) {
          appendCsv(ERRORES, 'sku,proveedor,url,error', [p.slug, provider, pdfUrl, e.message]);
        }
      }
    }
  }

  if (!anyMatch) stats.sinMatch.push(p);
  else stats.conMatch.push(p);
}

function folderSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else total += fs.statSync(p).size;
    }
  };
  walk(dir);
  return total;
}

async function main() {
  const args = parseArgs();
  fs.mkdirSync(OUT, { recursive: true });
  // reset manifest/errores for fresh run unless --append
  if (!process.argv.includes('--append')) {
    if (fs.existsSync(MANIFEST)) fs.unlinkSync(MANIFEST);
    if (fs.existsSync(ERRORES)) fs.unlinkSync(ERRORES);
  }

  const targets = collectTargets(args);
  console.log(`SKUs a buscar: ${targets.length}`);
  // line-buffer progress
  if (process.stdout._handle?.setBlocking) process.stdout._handle.setBlocking(true);
  const stats = {
    byMatch: { exacto: 0, serie: 0, dudoso: 0 },
    skuMatch: {},
    sinMatch: [],
    sinProveedor: [],
    conMatch: [],
  };
  const seenDownload = new Map();

  let i = 0;
  const progressFile = path.join(OUT, '_progress.txt');
  for (const p of targets) {
    i++;
    const line = `[${i}/${targets.length}] ${p.brand} · ${p.slug} → ${p.providers.join('+') || 'sin proveedor'}`;
    console.log(line);
    fs.appendFileSync(progressFile, line + '\n');
    try {
      await processProduct(p, stats, seenDownload);
    } catch (e) {
      appendCsv(ERRORES, 'sku,proveedor,url,error', [p.slug, '-', '-', e.message]);
    }
  }

  // SKU-level match (best)
  const skuExact = [];
  const skuSerie = [];
  const skuDudoso = [];
  for (const [slug, set] of Object.entries(stats.skuMatch)) {
    if (set.has('exacto')) skuExact.push(slug);
    else if (set.has('serie')) skuSerie.push(slug);
    else skuDudoso.push(slug);
  }

  const sinPorMarca = {};
  for (const p of [...stats.sinMatch, ...stats.sinProveedor]) {
    const b = p.brand || 'Sin marca';
    (sinPorMarca[b] = sinPorMarca[b] || []).push(p.slug);
  }

  const bytes = folderSize(OUT);
  const mb = (bytes / (1024 * 1024)).toFixed(1);

  const md = [
    '# Resumen descarga imagenes-proveedores',
    '',
    `Actualizado: ${new Date().toISOString()}`,
    '',
    `## Cobertura por tipo de match (SKUs)`,
    '',
    `| Match | SKUs |`,
    `|---|---:|`,
    `| exacto | ${skuExact.length} |`,
    `| serie | ${skuSerie.length} |`,
    `| dudoso | ${skuDudoso.length} |`,
    `| sin coincidencia | ${stats.sinMatch.length + stats.sinProveedor.length} |`,
    `| **total buscados** | ${targets.length} |`,
    '',
    `Archivos en manifest (filas imagen): exacto=${stats.byMatch.exacto}, serie=${stats.byMatch.serie}, dudoso=${stats.byMatch.dudoso}`,
    '',
    `## Peso carpeta`,
    '',
    `- **${mb} MB** (${bytes} bytes)`,
    '',
    `## SKUs sin coincidencia (por marca)`,
    '',
    ...Object.entries(sinPorMarca)
      .sort((a, b) => b[1].length - a[1].length)
      .map(
        ([b, slugs]) =>
          `### ${b} (${slugs.length})\n\n${slugs.map((s) => `- ${s}`).join('\n')}\n`
      ),
    '',
  ].join('\n');
  fs.writeFileSync(RESUMEN, md);
  console.log('\n' + md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
