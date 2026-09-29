/**
 * Importación masiva (upsert) del catálogo de la tienda desde un Excel.
 *
 * - Si el Modelo/SKU ya existe: actualiza SOLO precio, stock y especificaciones.
 *   No toca slug, título, descripción, imagen ni orden, para no romper enlaces indexados.
 * - Si no existe: crea la ficha nueva con slug amigable y todos los campos.
 * - Nunca borra productos que no vengan en el archivo.
 *
 * El mapeo de categorías vive en src/config/categorias-tienda.json (editable aparte).
 *
 * Uso:
 *   node scripts/importar-catalogo-xlsx.mjs --dry-run
 *   node scripts/importar-catalogo-xlsx.mjs --aplicar
 *   node scripts/importar-catalogo-xlsx.mjs --dry-run --archivo data/otro.xlsx --hoja "Precios Público"
 */

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const ROOT = path.join(import.meta.dirname, '..');
const DIR_PRODUCTOS = path.join(ROOT, 'src', 'content', 'productos');
const CONFIG = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'config', 'categorias-tienda.json'), 'utf8')
);

/** Orden base de los productos importados: por encima del lote mayorista (5000+). */
const ORDER_BASE = 6000;

/**
 * Valores de la columna Modelo que no identifican un producto y no sirven como clave
 * de upsert (harían coincidir productos distintos entre sí).
 */
const MODELOS_NO_FIABLES = new Set(['na', 'n', 'wifi', 'accesoriomonitor', 'generico', 'varios']);

/** Bajada de precio a partir de la cual el producto se marca como liquidación. */
const UMBRAL_ALERTA_PRECIO = 0.25;

/** Banner provisional del bloque de liquidación (generado por generar-placeholders-categorias.mjs). */
const BANNER_LIQUIDACION = '/images/placeholders/promo-liquidacion.svg';

function esModeloUsable(kModelo) {
  if (!kModelo || kModelo.length < 3) return false;
  if (MODELOS_NO_FIABLES.has(kModelo)) return false;
  // "3000w", "6000w": describen potencia, no una referencia de fabricante.
  if (/^\d+w?$/.test(kModelo)) return false;
  return true;
}

// ---------------------------------------------------------------- argumentos

function parseArgs(argv) {
  const args = { dryRun: false, aplicar: false, archivo: null, hoja: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--aplicar') args.aplicar = true;
    else if (a === '--archivo') args.archivo = argv[++i];
    else if (a === '--hoja') args.hoja = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.dryRun === args.aplicar) {
  console.error('Indicá exactamente un modo: --dry-run (simula) o --aplicar (escribe archivos).');
  process.exit(1);
}

const ARCHIVO = path.resolve(
  args.archivo || path.join(ROOT, 'data', 'Catalogo_Reiki_Publico_SEO_Perfecto_Final.xlsx')
);

if (!fs.existsSync(ARCHIVO)) {
  console.error('No se encontró el archivo:', ARCHIVO);
  process.exit(1);
}

// ------------------------------------------------------------------ helpers

/** Clave de comparación: sin tildes, sin símbolos, minúsculas. */
function clave(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function limpiar(valor) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim();
}

/** Slug amigable: minúsculas, sin tildes, guiones, recortado en borde de palabra. */
function slugify(texto, maxLargo = 70) {
  const base = String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base.length <= maxLargo) return base;
  const corte = base.slice(0, maxLargo);
  const guion = corte.lastIndexOf('-');
  return (guion > maxLargo * 0.6 ? corte.slice(0, guion) : corte).replace(/-+$/, '');
}

function precioCOP(valor) {
  const n = typeof valor === 'number' ? valor : parseInt(String(valor).replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `$${Math.round(n).toLocaleString('es-CO')}`;
}

function escaparYaml(valor) {
  return `"${String(valor).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Valores del Excel que no aportan nada y no deben llegar a la ficha. */
const VALOR_VACIO = /\bno\s+especificad[oa]s?\b|^n\/?a$|^-+$|^sin\s+dato/i;

/**
 * Claves que ya viven como campos estructurados del producto (brand, model, category)
 * y solo duplicarían información en la tabla de especificaciones.
 */
const CLAVES_REDUNDANTES = /^(categor[ií]a|marca|modelo)$/i;

/**
 * Convierte el texto de especificaciones en líneas "Etiqueta: valor".
 * Entrada: "Categoría: X | Tipo: Y | ... | Especificación principal: Z. Aplicación: W."
 */
function partirSpecs(texto) {
  return limpiar(texto)
    .split('|')
    .flatMap((bloque) => bloque.split(/\.\s+(?=[A-ZÁÉÍÓÚÑ][^.:]{2,30}:)/))
    .map((s) => limpiar(s).replace(/\.$/, ''))
    .filter((s) => {
      if (s.length <= 2) return false;
      const i = s.indexOf(':');
      if (i > 0) {
        const etiqueta = s.slice(0, i).trim();
        const valor = s.slice(i + 1).trim();
        if (CLAVES_REDUNDANTES.test(etiqueta)) return false;
        if (!valor || VALOR_VACIO.test(valor)) return false;
      }
      return !VALOR_VACIO.test(s);
    });
}

/**
 * Quita de la descripción los fragmentos sin dato, del tipo
 * "Marca: marca no especificada; modelo: modelo no especificado; especificación principal: X".
 */
function limpiarDescripcion(texto) {
  const frases = limpiar(texto).split(/(?<=\.)\s+/);

  const limpias = frases.map((frase) => {
    if (!frase.includes(';')) return VALOR_VACIO.test(frase) ? '' : frase;

    const segmentos = frase
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !VALOR_VACIO.test(s));

    if (segmentos.length === 0) return '';

    const unida = segmentos.join('; ').replace(/;?\s*\.?$/, '.');
    return unida.charAt(0).toUpperCase() + unida.slice(1);
  });

  return limpiar(limpias.filter(Boolean).join(' '));
}

function partirKeywords(texto, max = 8) {
  const vistas = new Set();
  const salida = [];
  for (const kw of String(texto ?? '').split(',')) {
    const limpia = limpiar(kw).toLowerCase();
    if (limpia.length < 4 || vistas.has(limpia)) continue;
    vistas.add(limpia);
    salida.push(limpia);
    if (salida.length >= max) break;
  }
  return salida;
}

// ------------------------------------------------- frontmatter (leer/escribir)

/** Parser acotado al frontmatter que genera este proyecto: escalares y listas "  - valor". */
function leerFrontmatter(contenido) {
  const m = contenido.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;

  const datos = {};
  const orden = [];
  let claveLista = null;

  for (const linea of m[1].split(/\r?\n/)) {
    const item = linea.match(/^\s+-\s+(.*)$/);
    if (item && claveLista) {
      datos[claveLista].push(desescalar(item[1]));
      continue;
    }
    const par = linea.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!par) continue;

    const [, k, v] = par;
    orden.push(k);
    if (v.trim() === '') {
      claveLista = k;
      datos[k] = [];
    } else {
      claveLista = null;
      datos[k] = desescalar(v);
    }
  }

  return { datos, orden, cuerpo: m[2] };
}

function desescalar(valor) {
  const v = valor.trim();
  if (/^".*"$/s.test(v)) return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  return v;
}

function serializarValor(valor) {
  if (typeof valor === 'boolean' || typeof valor === 'number') return String(valor);
  return escaparYaml(valor);
}

function escribirFrontmatter({ datos, orden, cuerpo }) {
  const claves = [...orden, ...Object.keys(datos).filter((k) => !orden.includes(k))];
  const vistas = new Set();
  const lineas = ['---'];

  for (const k of claves) {
    if (vistas.has(k) || datos[k] === undefined) continue;
    vistas.add(k);
    const v = datos[k];
    if (Array.isArray(v)) {
      lineas.push(`${k}:`);
      for (const item of v) lineas.push(`  - ${escaparYaml(item)}`);
    } else {
      lineas.push(`${k}: ${serializarValor(v)}`);
    }
  }

  lineas.push('---', '');
  return `${lineas.join('\n')}${cuerpo.replace(/^\n+/, '')}`;
}

// ------------------------------------------------------- catálogo actual

function cargarCatalogo() {
  const productos = [];
  for (const archivo of fs.readdirSync(DIR_PRODUCTOS).filter((f) => f.endsWith('.md'))) {
    const ruta = path.join(DIR_PRODUCTOS, archivo);
    const parsed = leerFrontmatter(fs.readFileSync(ruta, 'utf8'));
    if (!parsed) {
      console.warn(`  aviso: no se pudo leer el frontmatter de ${archivo}`);
      continue;
    }
    productos.push({
      ruta,
      slug: archivo.replace(/\.md$/i, ''),
      parsed,
      kSku: clave(parsed.datos.sku),
      kModel: clave(parsed.datos.model),
      kTitle: clave(parsed.datos.title),
      kBrand: clave(parsed.datos.brand),
    });
  }
  return productos;
}

/**
 * Busca el producto existente en tres pasadas, de la más estricta a la más laxa.
 * La tercera cubre el lote "cat-mayorista", donde `model` guarda el título completo.
 */
function buscarExistente(catalogo, { kModelo, kNombre, kMarca }) {
  if (esModeloUsable(kModelo)) {
    const porSku = catalogo.find((p) => p.kSku && p.kSku === kModelo);
    if (porSku) return { producto: porSku, via: 'sku' };

    const porModelo = catalogo.find((p) => p.kModel && p.kModel === kModelo);
    if (porModelo) return { producto: porModelo, via: 'modelo' };

    if (kModelo.length >= 5) {
      const contenido = catalogo.find(
        (p) =>
          (!kMarca || !p.kBrand || p.kBrand === kMarca) &&
          (p.kTitle.includes(kModelo) || p.kModel.includes(kModelo))
      );
      if (contenido) return { producto: contenido, via: 'modelo-en-titulo' };
    }
  }

  const porNombre = catalogo.find((p) => p.kTitle && p.kTitle === kNombre);
  if (porNombre) return { producto: porNombre, via: 'nombre' };

  return null;
}

// -------------------------------------------------------------- importación

function imagenPara(marca, categoriaId) {
  const logo = CONFIG.logosPorMarca[clave(marca).replace(/([a-z])([0-9])/g, '$1 $2')] ??
    CONFIG.logosPorMarca[String(marca ?? '').trim().toLowerCase()];
  if (logo) return { image: logo, pendiente: false };

  const cat = CONFIG.categorias.find((c) => c.id === categoriaId);
  return { image: cat?.imagenPorDefecto ?? '/images/placeholders/inversores.svg', pendiente: true };
}

function main() {
  const modo = args.aplicar ? 'APLICAR' : 'SIMULACIÓN (dry-run)';
  console.log(`\n=== Importación de catálogo · modo ${modo} ===`);
  console.log(`Archivo: ${path.relative(ROOT, ARCHIVO)}`);

  const wb = XLSX.readFile(ARCHIVO);
  const hoja = args.hoja || wb.SheetNames[0];
  if (!wb.Sheets[hoja]) {
    console.error(`La hoja "${hoja}" no existe. Hojas disponibles: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { defval: '' });
  console.log(`Hoja "${hoja}": ${filas.length} filas\n`);

  const catalogo = cargarCatalogo();
  console.log(`Catálogo actual: ${catalogo.length} productos\n`);

  const slugsUsados = new Set(catalogo.map((p) => p.slug));
  const modelosEnArchivo = new Map();
  /** slug del producto existente -> fila que ya lo actualizó, para detectar colisiones. */
  const productosTocados = new Map();
  const reporte = {
    creados: [],
    actualizados: [],
    omitidos: [],
    duplicadosEnArchivo: [],
    colisiones: [],
    cambiosGrandesDePrecio: [],
    enLiquidacion: [],
    preciosInvalidos: [],
    sinModelo: [],
    variantes: [],
    categoriasNuevas: new Set(),
    sinImagenReal: 0,
  };

  const escrituras = [];
  let contadorOrden = ORDER_BASE;

  filas.forEach((fila, i) => {
    const numeroFila = i + 2; // +1 por encabezado, +1 porque Excel es 1-indexed
    const nombre = limpiar(fila['Nombre']);
    const modelo = limpiar(fila['Modelo']);
    const marca = limpiar(fila['Marca']);
    const tipo = limpiar(fila['Tipo']);
    const potencia = limpiar(fila['Potencia']);
    const categoriaExcel = limpiar(fila['Categoría'] ?? fila['Categoria']);

    if (!nombre) {
      reporte.omitidos.push({ fila: numeroFila, motivo: 'Sin nombre' });
      return;
    }

    const categoriaId = CONFIG.mapeoDesdeExcel[categoriaExcel];
    if (!categoriaId) {
      reporte.omitidos.push({
        fila: numeroFila,
        nombre,
        motivo: `Categoría "${categoriaExcel}" sin mapeo en categorias-tienda.json`,
      });
      return;
    }
    reporte.categoriasNuevas.add(categoriaId);

    const precio = precioCOP(fila['Precio de Venta (COP)']);
    if (!precio) {
      reporte.preciosInvalidos.push({ fila: numeroFila, nombre, valor: fila['Precio de Venta (COP)'] });
      reporte.omitidos.push({ fila: numeroFila, nombre, motivo: 'Precio vacío o en cero' });
      return;
    }

    const kModelo = clave(modelo);
    if (!esModeloUsable(kModelo)) {
      reporte.sinModelo.push({ fila: numeroFila, nombre, modelo });
    } else {
      const previa = modelosEnArchivo.get(kModelo);
      if (previa) {
        reporte.duplicadosEnArchivo.push({ modelo, filas: [previa, numeroFila], nombre });
      } else {
        modelosEnArchivo.set(kModelo, numeroFila);
      }
    }

    const stock = CONFIG.mapeoStock[limpiar(fila['Stock'])] ?? 'disponible';
    const specs = partirSpecs(fila['Especificaciones Técnicas']);
    const descripcion = limpiarDescripcion(fila['Descripción (SEO)']) || nombre;
    const keywords = partirKeywords(fila['Palabras SEO']);

    const match = buscarExistente(catalogo, { kModelo, kNombre: clave(nombre), kMarca: clave(marca) });

    if (match) {
      // Dos filas del archivo apuntando al mismo producto: solo la primera manda.
      const yaTocado = productosTocados.get(match.producto.slug);
      if (yaTocado) {
        reporte.colisiones.push({
          slug: match.producto.slug,
          filaAplicada: yaTocado.fila,
          nombreAplicado: yaTocado.nombre,
          filaIgnorada: numeroFila,
          nombreIgnorado: nombre,
          modelo,
        });
        reporte.omitidos.push({
          fila: numeroFila,
          nombre,
          motivo: `Colisión: la fila ${yaTocado.fila} ya actualizó ${match.producto.slug}`,
        });
        return;
      }
      productosTocados.set(match.producto.slug, { fila: numeroFila, nombre });

      // Actualización: solo precio, stock y especificaciones. Todo lo demás se conserva.
      const { datos, orden, cuerpo } = match.producto.parsed;
      const cambios = [];

      if (datos.price !== precio) {
        const anterior = parseInt(String(datos.price).replace(/[^0-9]/g, ''), 10) || 0;
        const nuevo = parseInt(precio.replace(/[^0-9]/g, ''), 10);
        const variacion = anterior > 0 ? (nuevo - anterior) / anterior : 0;

        if (Math.abs(variacion) >= UMBRAL_ALERTA_PRECIO) {
          reporte.cambiosGrandesDePrecio.push({
            slug: match.producto.slug,
            nombre,
            fila: numeroFila,
            anterior: datos.price,
            nuevo: precio,
            variacionPct: Math.round(variacion * 100),
          });

          // Una bajada fuerte se publica como liquidación, con el precio anterior a la vista.
          if (variacion < 0) {
            datos.precioAnterior = datos.price;
            datos.descuentoPct = Math.round(Math.abs(variacion) * 100);
            datos.promocion = 'Liquidación';
            datos.promoImagen = BANNER_LIQUIDACION;
            cambios.push(`marcado como liquidación -${datos.descuentoPct}%`);
            reporte.enLiquidacion.push({
              slug: match.producto.slug,
              nombre,
              precioAnterior: datos.price,
              precio,
              descuentoPct: datos.descuentoPct,
            });
          }
        } else if (datos.precioAnterior) {
          // El precio volvió a su rango normal: se retira la promoción.
          delete datos.precioAnterior;
          delete datos.descuentoPct;
          delete datos.promocion;
          delete datos.promoImagen;
          cambios.push('promoción de liquidación retirada');
        }

        cambios.push(`precio ${datos.price} → ${precio}`);
        datos.price = precio;
      }
      if ((datos.stock ?? 'disponible') !== stock) {
        cambios.push(`stock ${datos.stock ?? 'disponible'} → ${stock}`);
        datos.stock = stock;
      }
      if (specs.length > 0 && JSON.stringify(datos.specifications) !== JSON.stringify(specs)) {
        cambios.push(`${(datos.specifications ?? []).length} → ${specs.length} especificaciones`);
        datos.specifications = specs;
      }

      if (match.via === 'nombre' && kModelo && kModelo !== 'na' && clave(datos.model) !== kModelo) {
        reporte.variantes.push({
          fila: numeroFila,
          nombre,
          modeloArchivo: modelo,
          modeloExistente: datos.model ?? '(sin modelo)',
          slug: match.producto.slug,
        });
      }

      if (cambios.length === 0) {
        reporte.omitidos.push({ fila: numeroFila, nombre, motivo: 'Sin cambios respecto al catálogo' });
        return;
      }

      if (!datos.sku && modelo && kModelo !== 'na') datos.sku = modelo;
      if (potencia && !datos.power) datos.power = potencia;
      datos.updatedAt = new Date().toISOString().slice(0, 10);

      escrituras.push({ ruta: match.producto.ruta, contenido: escribirFrontmatter({ datos, orden, cuerpo }) });
      reporte.actualizados.push({ slug: match.producto.slug, nombre, via: match.via, cambios });
      return;
    }

    // Creación
    let slug = slugify(nombre);
    if (!slug) slug = slugify(`${marca}-${modelo}`) || `producto-${numeroFila}`;
    if (slugsUsados.has(slug)) {
      const conModelo = slugify(`${slug}-${modelo}`);
      slug = slugsUsados.has(conModelo) ? `${slug}-${numeroFila}` : conModelo;
    }
    slugsUsados.add(slug);

    const { image, pendiente } = imagenPara(marca, categoriaId);
    if (pendiente) reporte.sinImagenReal++;

    const datos = {
      title: nombre,
      description: descripcion,
      image,
      category: categoriaId,
      price: precio,
      specifications: specs.length > 0 ? specs : [`Tipo: ${tipo || 'Equipo solar'}`],
    };
    if (marca) datos.brand = marca;
    if (modelo && kModelo !== 'na') {
      datos.model = modelo;
      datos.sku = modelo;
    }
    if (potencia) datos.power = potencia;
    datos.stock = stock;
    datos.order = contadorOrden++;
    if (pendiente) datos.imagenPendiente = true;
    datos.updatedAt = new Date().toISOString().slice(0, 10);
    if (keywords.length > 0) datos.seoKeywords = keywords;

    const cuerpo = [
      `**${nombre}**${marca ? ` de ${marca}` : ''}${potencia ? ` · ${potencia}` : ''}.`,
      '',
      descripcion,
      '',
      'Reiki Solar gestiona disponibilidad e importación; el envío nacional se cotiza según destino.',
      '',
    ].join('\n');

    escrituras.push({
      ruta: path.join(DIR_PRODUCTOS, `${slug}.md`),
      contenido: escribirFrontmatter({ datos, orden: Object.keys(datos), cuerpo }),
    });
    reporte.creados.push({ slug, nombre, categoria: categoriaId, precio, imagenPendiente: pendiente });
  });

  // ---------------------------------------------------------------- escritura

  if (args.aplicar) {
    for (const { ruta, contenido } of escrituras) fs.writeFileSync(ruta, contenido, 'utf8');
    console.log(`Escritos ${escrituras.length} archivos en src/content/productos/\n`);
  } else {
    console.log(`Se escribirían ${escrituras.length} archivos (no se modificó nada).\n`);
  }

  // ------------------------------------------------------------------ reporte

  const separador = '─'.repeat(64);
  console.log(separador);
  console.log('RESUMEN');
  console.log(separador);
  console.log(`  Creados .............. ${reporte.creados.length}`);
  console.log(`  Actualizados ......... ${reporte.actualizados.length}`);
  console.log(`  Omitidos ............. ${reporte.omitidos.length}`);
  console.log(`  Catálogo resultante .. ${catalogo.length + reporte.creados.length} productos`);
  console.log(`\n  Sin imagen real (logo de marca o placeholder): ${reporte.sinImagenReal}`);

  console.log(`\n${separador}\nPRODUCTOS NUEVOS POR CATEGORÍA\n${separador}`);
  const porCategoria = {};
  for (const c of reporte.creados) porCategoria[c.categoria] = (porCategoria[c.categoria] || 0) + 1;
  for (const [cat, n] of Object.entries(porCategoria).sort((a, b) => b[1] - a[1])) {
    const nombre = CONFIG.categorias.find((c) => c.id === cat)?.nombre ?? cat;
    console.log(`  ${nombre.padEnd(26)} ${String(n).padStart(4)}`);
  }

  if (reporte.actualizados.length > 0) {
    console.log(`\n${separador}\nACTUALIZADOS\n${separador}`);
    for (const a of reporte.actualizados) {
      console.log(`  [${a.via}] ${a.slug}`);
      for (const c of a.cambios) console.log(`      · ${c}`);
    }
  }

  if (reporte.cambiosGrandesDePrecio.length > 0) {
    console.log(`\n${separador}\nCAMBIOS DE PRECIO MAYORES AL ${UMBRAL_ALERTA_PRECIO * 100}%\n${separador}`);
    for (const c of reporte.cambiosGrandesDePrecio) {
      const signo = c.variacionPct > 0 ? '+' : '';
      console.log(`  ${c.slug}`);
      console.log(`      ${c.anterior} → ${c.nuevo}  (${signo}${c.variacionPct}%)  fila ${c.fila}`);
    }
  }

  if (reporte.enLiquidacion.length > 0) {
    console.log(`\n${separador}\nPUBLICADOS EN LIQUIDACIÓN (banner provisional)\n${separador}`);
    for (const l of reporte.enLiquidacion) {
      console.log(`  -${l.descuentoPct}%  ${l.precioAnterior} → ${l.precio}  ${l.slug}`);
    }
    console.log(`\n  Banner de prueba: ${BANNER_LIQUIDACION}`);
  }

  console.log(`\n${separador}\nREVISAR\n${separador}`);

  console.log(`  Filas ignoradas por colisión (mismo producto ya actualizado): ${reporte.colisiones.length}`);
  for (const c of reporte.colisiones) {
    console.log(`      · ${c.slug}: se aplicó la fila ${c.filaAplicada}, se ignoró la ${c.filaIgnorada} ("${c.nombreIgnorado}")`);
  }

  console.log(`  Modelos duplicados dentro del archivo: ${reporte.duplicadosEnArchivo.length}`);
  for (const d of reporte.duplicadosEnArchivo.slice(0, 15)) {
    console.log(`      · "${d.modelo}" en filas ${d.filas.join(' y ')}`);
  }
  if (reporte.duplicadosEnArchivo.length > 15) console.log(`      … y ${reporte.duplicadosEnArchivo.length - 15} más`);

  console.log(`  Precios vacíos o en cero: ${reporte.preciosInvalidos.length}`);
  for (const p of reporte.preciosInvalidos.slice(0, 10)) console.log(`      · fila ${p.fila}: ${p.nombre}`);

  console.log(`  Filas sin Modelo usable (N/A o vacío): ${reporte.sinModelo.length}`);
  for (const s of reporte.sinModelo.slice(0, 10)) console.log(`      · fila ${s.fila}: ${s.nombre}`);
  if (reporte.sinModelo.length > 10) console.log(`      … y ${reporte.sinModelo.length - 10} más`);

  console.log(`  Mismo Nombre con Modelo distinto (posible variante): ${reporte.variantes.length}`);
  for (const v of reporte.variantes.slice(0, 10)) {
    console.log(`      · fila ${v.fila}: "${v.nombre}" archivo=${v.modeloArchivo} vs catálogo=${v.modeloExistente}`);
  }

  const motivos = {};
  for (const o of reporte.omitidos) motivos[o.motivo] = (motivos[o.motivo] || 0) + 1;
  if (Object.keys(motivos).length > 0) {
    console.log('\n  Omitidos por motivo:');
    for (const [motivo, n] of Object.entries(motivos)) console.log(`      · ${motivo}: ${n}`);
  }

  const rutaReporte = path.join(ROOT, 'data', 'reporte-importacion.json');
  fs.writeFileSync(
    rutaReporte,
    JSON.stringify(
      {
        fecha: new Date().toISOString(),
        modo,
        archivo: path.relative(ROOT, ARCHIVO),
        resumen: {
          filas: filas.length,
          creados: reporte.creados.length,
          actualizados: reporte.actualizados.length,
          omitidos: reporte.omitidos.length,
          sinImagenReal: reporte.sinImagenReal,
        },
        ...reporte,
        categoriasNuevas: [...reporte.categoriasNuevas],
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\nReporte completo: ${path.relative(ROOT, rutaReporte)}`);

  if (!args.aplicar) {
    console.log('\nPara aplicar los cambios: node scripts/importar-catalogo-xlsx.mjs --aplicar\n');
  }
}

main();
