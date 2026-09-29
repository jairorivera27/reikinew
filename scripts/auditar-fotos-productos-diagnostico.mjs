/**
 * Diagnóstico profundo de imágenes de producto (NO modifica archivos).
 * Usa sharp (ya viene con Astro) para px / formato / muestreo de bordes.
 *
 * Uso: node scripts/auditar-fotos-productos-diagnostico.mjs
 * Salida: docs/auditoria-imagenes.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROD_DIR = path.join(ROOT, 'src', 'content', 'productos');
const OUT = path.join(ROOT, 'docs', 'auditoria-imagenes.md');

function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[mm[1]] = v;
  }
  return out;
}

function kb(n) {
  return Math.round((n / 1024) * 10) / 10;
}

/** Clasifica fondo por luminancia media de un anillo de bordes (10% exterior). */
function classifyBackground(stats) {
  // stats: { meanCorner, meanEdge, meanCenter, hasAlpha, opaqueRatio }
  if (stats.hasAlpha && stats.opaqueRatio < 0.92) return 'transparente / con alpha';
  const m = stats.meanEdge;
  if (m >= 245) return 'blanco limpio';
  if (m >= 230) return 'casi blanco / gris muy claro';
  if (m >= 200) return 'gris claro / sucio claro';
  if (m >= 140) return 'gris medio / fondo no estudio';
  if (stats.meanEdge < 80 && stats.meanCenter > 120) return 'fondo oscuro / producto claro';
  return 'fondo complejo / escenografía';
}

async function analyzeRaster(abs) {
  const fileSize = fs.statSync(abs).size;
  const img = sharp(abs, { failOn: 'none' });
  const meta = await img.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const format = meta.format || path.extname(abs).slice(1).toLowerCase();

  let fondo = '—';
  let marcasAgua = 'no detectada (auto)';
  let textosBordes = 'revisar visual';
  let hasAlpha = Boolean(meta.hasAlpha);

  try {
    const { data, info } = await sharp(abs, { failOn: 'none' })
      .ensureAlpha()
      .resize(64, 64, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels; // 4
    let edgeSum = 0;
    let edgeN = 0;
    let cornerSum = 0;
    let cornerN = 0;
    let centerSum = 0;
    let centerN = 0;
    let opaque = 0;

    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * channels;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a > 200) opaque += 1;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const onEdge = x < 4 || x > 59 || y < 4 || y > 59;
        const onCorner =
          (x < 6 && y < 6) || (x > 57 && y < 6) || (x < 6 && y > 57) || (x > 57 && y > 57);
        const onCenter = x >= 24 && x <= 39 && y >= 24 && y <= 39;
        if (onEdge) {
          edgeSum += lum;
          edgeN += 1;
        }
        if (onCorner) {
          cornerSum += lum;
          cornerN += 1;
        }
        if (onCenter) {
          centerSum += lum;
          centerN += 1;
        }
      }
    }

    const meanEdge = edgeN ? edgeSum / edgeN : 0;
    const meanCorner = cornerN ? cornerSum / cornerN : 0;
    const meanCenter = centerN ? centerSum / centerN : 0;
    const opaqueRatio = opaque / (64 * 64);

    fondo = classifyBackground({ meanCorner, meanEdge, meanCenter, hasAlpha, opaqueRatio });

    // Variación alta en esquinas a menudo = watermark o collage
    // (proxy burdo: diferencia corner vs edge)
    if (Math.abs(meanCorner - meanEdge) > 35 && meanCorner < 200) {
      textosBordes = 'posible texto/borde en esquinas';
    }
    if (/watermark|marca-agua|aliexpress|amazon|mercadolibre|shopee/i.test(abs)) {
      marcasAgua = 'posible (nombre archivo)';
    }
  } catch {
    fondo = 'no analizable';
  }

  return {
    width: w,
    height: h,
    format,
    size: fileSize,
    fondo,
    marcasAgua,
    textosBordes,
    hasAlpha,
    exists: true,
  };
}

const files = fs.readdirSync(PROD_DIR).filter((f) => f.endsWith('.md'));
const rows = [];
const byPath = new Map();
/** @type {Map<string, object>} */
const probeCache = new Map();

console.log('Analizando', files.length, 'fichas…');

for (const f of files) {
  const raw = fs.readFileSync(path.join(PROD_DIR, f), 'utf8');
  const fm = parseFm(raw);
  const draft = fm.draft === true || fm.draft === 'true';
  const img = String(fm.image || '').trim();
  const isExternal = /^https?:\/\//i.test(img);
  const isPlaceholder = /\/placeholders\//i.test(img) || /\.svg$/i.test(img);

  let meta = {
    width: 0,
    height: 0,
    format: isExternal ? 'url' : isPlaceholder ? 'svg' : '?',
    size: 0,
    fondo: isPlaceholder ? 'placeholder SVG' : isExternal ? 'URL externa' : '—',
    marcasAgua: '—',
    textosBordes: '—',
    hasAlpha: false,
    exists: false,
  };

  if (img && !isExternal && !isPlaceholder) {
    if (probeCache.has(img)) {
      meta = probeCache.get(img);
    } else {
      const abs = path.join(ROOT, 'public', img.replace(/^\//, ''));
      if (fs.existsSync(abs)) {
        try {
          meta = await analyzeRaster(abs);
        } catch (err) {
          meta = {
            width: 0,
            height: 0,
            format: '?',
            size: fs.statSync(abs).size,
            fondo: 'error al leer',
            marcasAgua: '—',
            textosBordes: '—',
            exists: true,
            error: String(err?.message || err),
          };
        }
      } else {
        meta = {
          width: 0,
          height: 0,
          format: '?',
          size: 0,
          fondo: 'ARCHIVO AUSENTE',
          marcasAgua: '—',
          textosBordes: '—',
          exists: false,
        };
      }
      probeCache.set(img, meta);
    }
  } else if (isPlaceholder) {
    meta.exists = true;
    meta.format = 'svg';
  }

  const side = Math.max(meta.width || 0, meta.height || 0);
  const bajaCalidad = !isPlaceholder && !isExternal && meta.exists && side > 0 && side < 1000;

  const row = {
    file: f,
    slug: f.replace(/\.md$/, ''),
    title: fm.title || f,
    brand: fm.brand || '',
    model: fm.model || '',
    category: fm.category || '',
    draft,
    imagenPendiente: fm.imagenPendiente === true || fm.imagenPendiente === 'true',
    image: img,
    isExternal,
    isPlaceholder,
    ...meta,
    side,
    bajaCalidad,
  };
  rows.push(row);
  if (img) {
    if (!byPath.has(img)) byPath.set(img, []);
    byPath.get(img).push(row.slug);
  }
}

const active = rows.filter((r) => !r.draft);
const placeholders = active.filter((r) => r.isPlaceholder);
const reales = active.filter((r) => r.image && !r.isPlaceholder && !r.isExternal);
const externas = active.filter((r) => r.isExternal);
const ausentes = reales.filter((r) => !r.exists);
const baja = reales.filter((r) => r.bajaCalidad);
const shared = [...byPath.entries()]
  .filter(([, slugs]) => slugs.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

const fondos = {};
for (const r of reales) {
  fondos[r.fondo] = (fondos[r.fondo] || 0) + 1;
}

const uniquePaths = [...new Set(reales.map((r) => r.image))];
const uniqueMeta = uniquePaths.map((p) => ({ path: p, ...(probeCache.get(p) || {}) }));
const uniqueBaja = uniqueMeta.filter((m) => Math.max(m.width || 0, m.height || 0) > 0 && Math.max(m.width || 0, m.height || 0) < 1000);

const dirs = {};
for (const p of uniquePaths) {
  const key = p.replace(/^\//, '').split('/').slice(0, 3).join('/');
  dirs[key] = (dirs[key] || 0) + 1;
}

const lines = [];
lines.push('# Auditoría de imágenes de producto — diagnóstico');
lines.push('');
lines.push(`Fecha: ${new Date().toISOString().slice(0, 10)}`);
lines.push('');
lines.push('> **Estado: solo diagnóstico.** No se procesó, movió ni sobrescribió ninguna imagen.');
lines.push('> Esperando tu visto bueno antes del lote piloto (5 productos) y del catálogo completo.');
lines.push('');
lines.push('## 1. Dónde viven y cómo se referencian');
lines.push('');
lines.push('| Qué | Ubicación |');
lines.push('|---|---|');
lines.push('| Fichas MD | `src/content/productos/*.md` → frontmatter `image: "/images/…"` |');
lines.push('| Schema | `src/content/config.ts` → `image: z.string()` (+ flag `imagenPendiente`) |');
lines.push('| Archivos raster | `public/images/productos-tienda/{paneles-solares,inversores,baterias,…}/` |');
lines.push('| Placeholders | `public/images/placeholders/*.svg` |');
lines.push('| Logos de marca | `public/images/marcas/` (a veces usados como foto) |');
lines.push('| UI tienda | `<img src={…data.image}>` en `ProductCard`, `ProductoCardCompact`, `tienda/[slug].astro`, carrusel `Tienda.astro` |');
lines.push('| Índices JSON | `tienda/indice/*.json` expone `image` string |');
lines.push('| Bot / PDF | `data/whatsapp-product-index.json` + URL pública del mismo path |');
lines.push('');
lines.push('Hoy **no** se usa `<Image>` de Astro ni imports de `astro:assets`: son rutas públicas estáticas.');
lines.push('');
lines.push('## 2. Resumen');
lines.push('');
lines.push('| Métrica | Valor |');
lines.push('|---|---|');
lines.push(`| Productos MD totales | ${rows.length} |`);
lines.push(`| Activos (no draft) | ${active.length} |`);
lines.push(`| Placeholders SVG | ${placeholders.length} |`);
lines.push(`| Con foto raster local | ${reales.length} |`);
lines.push(`| Rutas de archivo únicas | ${uniquePaths.length} |`);
lines.push(`| URLs externas | ${externas.length} |`);
lines.push(`| Archivo ausente en disco | ${ausentes.length} |`);
lines.push(`| Productos con lado mayor < 1000 px | ${baja.length} |`);
lines.push(`| Archivos únicos < 1000 px | ${uniqueBaja.length} |`);
lines.push(`| Rutas compartidas (>1 SKU) | ${shared.length} |`);
lines.push('');
lines.push('### Carpetas (rutas únicas)');
lines.push('');
lines.push('| Carpeta | # archivos distintos referenciados |');
lines.push('|---|---|');
for (const [k, v] of Object.entries(dirs).sort((a, b) => b[1] - a[1])) {
  lines.push(`| \`${k}\` | ${v} |`);
}
lines.push('');
lines.push('### Clasificación de fondo (productos activos con raster)');
lines.push('');
lines.push('| Fondo (heurística bordes 64×64) | # productos |');
lines.push('|---|---|');
for (const [k, v] of Object.entries(fondos).sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${k} | ${v} |`);
}
lines.push('');
lines.push('## 3. Imágenes compartidas entre varios productos');
lines.push('');
lines.push('Misma foto (o logo) en varios SKUs — prioridad alta para foto oficial por modelo.');
lines.push('');
lines.push('| Imagen | # SKUs | Ejemplos |');
lines.push('|---|---|---|');
for (const [img, slugs] of shared.slice(0, 50)) {
  lines.push(
    `| \`${img}\` | ${slugs.length} | ${slugs.slice(0, 4).join(', ')}${slugs.length > 4 ? '…' : ''} |`
  );
}
if (shared.length > 50) lines.push(`| _…_ | ${shared.length - 50} filas más | |`);
lines.push('');
lines.push('## 4. Inventario completo (activos)');
lines.push('');
lines.push(
  '| Producto | Cat. | Ruta | Fmt | px | KB | Fondo | Marca agua | Textos/bordes | <1000px | Notas |'
);
lines.push('|---|---|---|---|---|---|---|---|---|---|---|');

for (const r of active.sort(
  (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
)) {
  const px = r.width && r.height ? `${r.width}×${r.height}` : r.isPlaceholder ? 'SVG' : '—';
  const peso = r.size ? kb(r.size) : '—';
  const notas = [
    r.imagenPendiente ? 'imagenPendiente' : '',
    !r.image ? 'sin image' : '',
    !r.exists && r.image && !r.isPlaceholder ? 'AUSENTE' : '',
    (byPath.get(r.image) || []).length > 1 ? `compartida×${(byPath.get(r.image) || []).length}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  lines.push(
    `| ${String(r.title).replace(/\|/g, '/')} | ${r.category} | \`${r.image || '—'}\` | ${r.format} | ${px} | ${peso} | ${r.fondo} | ${r.marcasAgua} | ${r.textosBordes} | ${r.bajaCalidad ? 'SÍ' : ''} | ${notas} |`
  );
}

lines.push('');
lines.push('## 5. Lista preliminar: no sirven / pedir foto de fabricante');
lines.push('');
lines.push('Criterio automático (sin upscale):');
lines.push('');
lines.push('1. Placeholder SVG o `imagenPendiente`.');
lines.push('2. Lado mayor < 1000 px.');
lines.push('3. Misma imagen compartida por muchos SKUs distintos (foto genérica de serie/logo).');
lines.push('4. Fondo clasificado como «complejo / escenografía» o sospecha de texto en esquinas (revisión visual).');
lines.push('');
lines.push(`En este diagnóstico: **${baja.length}** productos activos con resolución baja; **${shared.length}** rutas compartidas.`);
lines.push('');
lines.push('## 6. Siguiente paso (requiere tu OK)');
lines.push('');
lines.push('1. Instalar/usar `sharp` + `@imgly/background-removal-node` en `scripts/procesar-imagenes.mjs`.');
lines.push('2. Copiar originales a `imagenes-originales/` (nunca sobrescribir).');
lines.push('3. Piloto 5 SKUs (panel, inversor, batería, controlador, bomba) → `docs/contact-sheet.html`.');
lines.push('4. Tras tu aprobación visual, procesar el catálogo (1600×1600 WebP <150 KB, thumb 600, alts SEO, `<Image>` Astro).');
lines.push('');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');

console.log('Escrito:', OUT);
console.log(
  JSON.stringify(
    {
      productos: rows.length,
      activos: active.length,
      placeholders: placeholders.length,
      reales: reales.length,
      rutasUnicas: uniquePaths.length,
      ausentes: ausentes.length,
      bajaCalidadProductos: baja.length,
      bajaCalidadArchivos: uniqueBaja.length,
      compartidas: shared.length,
      fondos,
    },
    null,
    2
  )
);
