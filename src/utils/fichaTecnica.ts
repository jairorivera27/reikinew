/**
 * Arma la información técnica de la ficha de producto.
 *
 * Combina tres fuentes, en este orden de confianza:
 *   1. Las especificaciones del catálogo (lo que el proveedor entregó del equipo puntual).
 *   2. La hoja de datos del fabricante de su serie, cuando se la reconoce.
 *   3. Datos de contexto verificables: garantía de referencia y normativa aplicable.
 *
 * Nunca se completa un hueco con una suposición: si el equipo no tiene serie reconocida,
 * la ficha lo dice y ofrece la hoja de datos por WhatsApp.
 */
import config from '../config/fichas-tecnicas.json';

export interface GrupoEspecificaciones {
  titulo: string;
  filas: { clave: string; valor: string }[];
}

export interface SerieTecnica {
  id: string;
  nombre: string;
  marca: string;
  fuente: string;
  url: string;
  grupos: GrupoEspecificaciones[];
}

export interface Faq {
  pregunta: string;
  respuesta: string;
}

interface SerieConfig {
  id: string;
  nombre: string;
  marca: string;
  patrones: string[];
  fuente: string;
  url: string;
  especificaciones: Record<string, Record<string, string>>;
}

const SERIES = config.series as SerieConfig[];

/** Encabezados con los que se agrupan las especificaciones que trae el catálogo. */
const GRUPO_CATALOGO = 'Datos del equipo';

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/**
 * Serie del fabricante a la que pertenece el producto. Gana la primera que coincide, así
 * que en el JSON los patrones específicos van antes que los genéricos.
 */
export function resolverSerie(producto: {
  title: string;
  model?: string;
  brand?: string;
}): SerieTecnica | null {
  const texto = normalizar(`${producto.title} ${producto.model ?? ''}`);

  for (const serie of SERIES) {
    // La marca tiene que coincidir: "MIN " no debe capturar equipos de otro fabricante.
    if (producto.brand && serie.marca !== producto.brand) continue;
    if (!serie.patrones.some((p) => texto.includes(normalizar(p)))) continue;

    return {
      id: serie.id,
      nombre: serie.nombre,
      marca: serie.marca,
      fuente: serie.fuente,
      url: serie.url,
      grupos: Object.entries(serie.especificaciones).map(([titulo, filas]) => ({
        titulo,
        filas: Object.entries(filas).map(([clave, valor]) => ({ clave, valor })),
      })),
    };
  }

  return null;
}

/**
 * Convierte las líneas sueltas del catálogo ("Tipo: Híbrido") en un grupo de filas.
 * Las que no traen clave se muestran como texto en la columna de valor.
 */
export function grupoDelCatalogo(specs: string[] = []): GrupoEspecificaciones | null {
  const filas = specs
    .map((linea) => {
      const separador = linea.indexOf(':');
      if (separador === -1) return { clave: '', valor: linea.trim() };
      return {
        clave: linea.slice(0, separador).trim(),
        valor: linea.slice(separador + 1).trim(),
      };
    })
    .filter((f) => f.valor.length > 0);

  return filas.length > 0 ? { titulo: GRUPO_CATALOGO, filas } : null;
}

/** Garantía de referencia del fabricante para la categoría. */
export function garantiaDeCategoria(categoria: string): string | null {
  return (config.garantiasPorCategoria as Record<string, string>)[categoria] ?? null;
}

/** Normativa aplicable en Colombia para la categoría. */
export function certificacionesDeCategoria(categoria: string): string[] {
  return (config.certificacionesPorCategoria as Record<string, string[]>)[categoria] ?? [];
}

export const SERVICIOS = config.servicios as {
  icono: string;
  titulo: string;
  detalle: string;
}[];

/**
 * Preguntas frecuentes de la ficha: primero las propias de la categoría, después las
 * generales de la tienda.
 */
export function faqsDe(categoria: string): Faq[] {
  const porCategoria = (config.faqPorCategoria as Record<string, Faq[]>)[categoria] ?? [];
  return [...porCategoria, ...(config.faqGeneral as Faq[])];
}

export function faqJsonLd(faqs: Faq[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: f.respuesta },
    })),
  };
}

/**
 * Cuántas filas técnicas tiene la ficha en total. Sirve para decidir si mostrar el aviso
 * de "hoja de datos disponible a solicitud".
 */
export function contarFilas(grupos: GrupoEspecificaciones[]): number {
  return grupos.reduce((suma, g) => suma + g.filas.length, 0);
}
