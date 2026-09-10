/**
 * Puntaje con el que se ordenan los productos de la tienda.
 *
 * Manda la demanda real del mercado colombiano (que el equipo esté en el rango de
 * potencia y la marca que más se venden en su categoría), porque es lo que un comprador
 * espera encontrar primero. Después pesa la relación calidad-precio, aproximada con el
 * precio por unidad de potencia o capacidad, que es la métrica objetiva con la que se
 * comparan equipos solares. Completan el nivel de la marca, la disponibilidad y si el
 * producto ya tiene foto real.
 *
 * Se configura sin tocar código: los niveles de marca en src/config/marcas.json y los
 * equipos más demandados en src/config/relevancia-comercial.json.
 */
import marcasConfig from '../config/marcas.json';
import relevanciaConfig from '../config/relevancia-comercial.json';

/** Unidad con la que se compara cada categoría. */
type Unidad = 'W' | 'kWh' | 'A';

const UNIDAD_POR_CATEGORIA: Record<string, Unidad> = {
  paneles: 'W',
  inversores: 'W',
  bombeo: 'W',
  reflectores: 'W',
  cargadores: 'W',
  baterias: 'kWh',
  controladores: 'A',
  protecciones: 'A',
  // monitoreo queda fuera a propósito: sus especificaciones no son comparables entre sí.
};

/** Rangos plausibles: descartan valores corruptos del catálogo (ej. "6003003W"). */
const RANGO_VALIDO: Record<Unidad, [number, number]> = {
  W: [1, 500_000],
  kWh: [0.05, 500],
  A: [0.5, 2_000],
};

const PESOS = relevanciaConfig.pesos;
const PESOS_DEMANDA = relevanciaConfig.pesosDemanda;

interface ReglasCategoria {
  rangoPreferido?: { min: number; max: number };
  marcasDemandadas?: string[];
  modelosEstrella?: string[];
}

const REGLAS = relevanciaConfig.categorias as Record<string, ReglasCategoria>;

/** Cuántos productos por categoría reciben el distintivo de mejor calidad-precio. */
export const TOP_CALIDAD_PRECIO = 3;

/**
 * Los equipos se comparan por bandas de tamaño, no contra toda la categoría: por escala,
 * un inversor de 350 kW siempre tiene mejor precio por watt que uno residencial de 5 kW.
 * Sin bandas el ranking se llenaría de equipo industrial y dejaría fuera lo que más se
 * vende. Así gana el que está bien de precio *para su tamaño*.
 */
const BANDAS_DE_TAMANO = 4;
const MINIMO_PARA_BANDAS = 12;

export interface ProductoValorable {
  slug: string;
  category: string;
  price: string;
  brand?: string;
  power?: string;
  title: string;
  stock?: string;
  imagenPendiente?: boolean;
}

export interface ResultadoValor {
  puntaje: number;
  /** Precio por unidad, ej. 1250 (COP por W). Null si no se pudo calcular. */
  precioPorUnidad: number | null;
  unidad: Unidad | null;
  /** Magnitud detectada, ej. 585 (W) o 5.12 (kWh). */
  magnitud: number | null;
  /** Lleva el distintivo de mejor calidad-precio de su categoría. */
  destacado: boolean;
  _valor?: number;
}

function aNumero(texto: string): number {
  // En este catálogo no hay separador de miles: una coma siempre es decimal.
  const normalizado = texto.includes(',') && !texto.includes('.') ? texto.replace(',', '.') : texto;
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

function buscar(texto: string, unidad: string): number | null {
  const re = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${unidad}(?![a-z])`, 'i');
  const m = texto.match(re);
  if (!m) return null;
  const n = aNumero(m[1]);
  return Number.isFinite(n) ? n : null;
}

function enRango(valor: number, unidad: Unidad): number | null {
  const [min, max] = RANGO_VALIDO[unidad];
  return valor >= min && valor <= max ? valor : null;
}

/**
 * Extrae la magnitud comparable de un producto, buscando primero en el campo `power`
 * y cayendo al título cuando el catálogo no la trae.
 */
export function magnitudComparable(producto: ProductoValorable): number | null {
  const unidad = UNIDAD_POR_CATEGORIA[producto.category];
  if (!unidad) return null;

  for (const texto of [producto.power ?? '', producto.title]) {
    if (!texto || /^n\/?a$/i.test(texto.trim())) continue;

    if (unidad === 'kWh') {
      const kwh = buscar(texto, 'kWh');
      if (kwh !== null) return enRango(kwh, 'kWh');

      const wh = buscar(texto, 'Wh');
      if (wh !== null) return enRango(wh / 1000, 'kWh');

      // Sin capacidad declarada: se deduce de tensión × amperios-hora.
      const v = buscar(texto, 'V');
      const ah = buscar(texto, 'Ah');
      if (v !== null && ah !== null) return enRango((v * ah) / 1000, 'kWh');
      continue;
    }

    if (unidad === 'W') {
      const kw = buscar(texto, 'kW');
      if (kw !== null) return enRango(kw * 1000, 'W');

      const w = buscar(texto, 'W');
      if (w !== null) return enRango(w, 'W');
      continue;
    }

    // Amperios: se ignora "Ah", que es capacidad y no corriente.
    const sinAh = texto.replace(/\d+(?:[.,]\d+)?\s*Ah/gi, ' ');
    const a = buscar(sinAh, 'A');
    if (a !== null) return enRango(a, 'A');
  }

  return null;
}

export function precioNumero(price: string): number {
  const n = parseInt(String(price ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function nivelDeMarca(brand?: string): number {
  if (!brand) return 1;
  const entrada = (marcasConfig.marcas as Record<string, { nivel: number }>)[brand];
  return entrada?.nivel ?? 1;
}

/**
 * Qué tan cerca está la magnitud del rango que más se vende. Dentro del rango vale 1 y
 * fuera decae de forma suave, para que un equipo apenas por encima del tope no caiga al
 * fondo junto a uno diez veces más grande.
 */
function ajusteAlRango(magnitud: number, rango: { min: number; max: number }): number {
  if (magnitud >= rango.min && magnitud <= rango.max) return 1;
  const referencia = magnitud < rango.min ? rango.min : rango.max;
  const desvio = Math.abs(Math.log10(magnitud / referencia));
  return Math.max(0, 1 - desvio);
}

/** 0 a 1 según cuánto se parece el producto a lo que más se vende en su categoría. */
function puntajeDemanda(producto: ProductoValorable, magnitud: number | null): number {
  const reglas = REGLAS[producto.category];
  if (!reglas) return 0.5;

  const texto = `${producto.title} ${producto.model ?? ''}`.toLowerCase();

  const rango =
    reglas.rangoPreferido && magnitud !== null
      ? ajusteAlRango(magnitud, reglas.rangoPreferido)
      : 0.5;

  const marca = reglas.marcasDemandadas?.length
    ? reglas.marcasDemandadas.includes(producto.brand ?? '')
      ? 1
      : 0
    : 0.5;

  const modelo = reglas.modelosEstrella?.length
    ? reglas.modelosEstrella.some((clave) => texto.includes(clave))
      ? 1
      : 0
    : 0.5;

  return rango * PESOS_DEMANDA.rango + marca * PESOS_DEMANDA.marca + modelo * PESOS_DEMANDA.modelo;
}

/**
 * Calcula el puntaje de cada producto comparándolo con los de su misma categoría.
 * Devuelve un mapa por slug, porque el puntaje solo tiene sentido relativo al grupo.
 */
export function calcularValor(productos: ProductoValorable[]): Map<string, ResultadoValor> {
  const unidad = UNIDAD_POR_CATEGORIA[productos[0]?.category ?? ''] ?? null;

  const base = productos.map((p) => {
    const precio = precioNumero(p.price);
    const magnitud = magnitudComparable(p);
    return {
      producto: p,
      magnitud,
      precioPorUnidad: magnitud && precio > 0 ? precio / magnitud : null,
    };
  });

  const medidos = base.filter(
    (b): b is typeof b & { magnitud: number; precioPorUnidad: number } =>
      b.magnitud !== null && b.precioPorUnidad !== null
  );

  // Cortes de magnitud que delimitan las bandas de tamaño (cuartiles).
  const magnitudes = medidos.map((b) => b.magnitud).sort((a, b) => a - b);
  const usarBandas = medidos.length >= MINIMO_PARA_BANDAS;
  const cortes = usarBandas
    ? Array.from(
        { length: BANDAS_DE_TAMANO - 1 },
        (_, i) => magnitudes[Math.floor((magnitudes.length * (i + 1)) / BANDAS_DE_TAMANO)]
      )
    : [];

  const bandaDe = (magnitud: number): number =>
    cortes.filter((corte) => magnitud >= corte).length;

  /** Precios por unidad ordenados, agrupados por banda de tamaño. */
  const preciosPorBanda = new Map<number, number[]>();
  for (const b of medidos) {
    const banda = bandaDe(b.magnitud);
    const lista = preciosPorBanda.get(banda) ?? [];
    lista.push(b.precioPorUnidad);
    preciosPorBanda.set(banda, lista);
  }
  for (const lista of preciosPorBanda.values()) lista.sort((a, b) => a - b);

  /** 1 = el precio por unidad más bajo de su banda; 0.5 = sin métrica, ni premia ni castiga. */
  const percentil = (magnitud: number | null, precioPorUnidad: number | null): number => {
    if (magnitud === null || precioPorUnidad === null) return 0.5;
    const banda = preciosPorBanda.get(bandaDe(magnitud));
    if (!banda || banda.length < 2) return 0.5;
    const posicion = banda.findIndex((v) => v >= precioPorUnidad);
    const indice = posicion < 0 ? banda.length - 1 : posicion;
    return 1 - indice / (banda.length - 1);
  };

  const resultados = base.map((b) => {
    const p = b.producto;
    const puntaje =
      PESOS.demanda * puntajeDemanda(p, b.magnitud) +
      PESOS.valor * percentil(b.magnitud, b.precioPorUnidad) +
      PESOS.marca * ((nivelDeMarca(p.brand) - 1) / 4) +
      PESOS.disponibilidad * ((p.stock ?? 'disponible') === 'disponible' ? 1 : 0) +
      PESOS.imagen * (p.imagenPendiente ? 0 : 1);

    return {
      slug: p.slug,
      puntaje: Math.round(puntaje * 10) / 10,
      precioPorUnidad: b.precioPorUnidad === null ? null : Math.round(b.precioPorUnidad),
      unidad,
      magnitud: b.magnitud,
      destacado: false,
      /** Interno: define quién se lleva el distintivo, no el orden. */
      _valor: percentil(b.magnitud, b.precioPorUnidad),
    };
  });

  /*
   * El distintivo premia la relación calidad-precio, que no es lo mismo que el orden
   * del carrusel (ese lo manda la demanda). Solo lo reciben productos con precio por
   * unidad real, para que signifique algo, y que además sean de una marca reconocida:
   * un equipo sin marca barato no es una buena compra.
   */
  const candidatos = resultados
    .filter((r) => r.precioPorUnidad !== null)
    .filter((r) => nivelDeMarca(base.find((b) => b.producto.slug === r.slug)?.producto.brand) >= 3)
    .sort((a, b) => b._valor - a._valor)
    .slice(0, TOP_CALIDAD_PRECIO);
  for (const c of candidatos) c.destacado = true;

  for (const r of resultados) delete (r as { _valor?: number })._valor;

  return new Map(resultados.map((r) => [r.slug, r]));
}

/** Ordena de mejor a peor calidad-precio, usando el precio como desempate. */
export function ordenarPorValor<T extends ProductoValorable>(
  productos: T[],
  valores: Map<string, ResultadoValor>
): T[] {
  return [...productos].sort((a, b) => {
    const pa = valores.get(a.slug)?.puntaje ?? 0;
    const pb = valores.get(b.slug)?.puntaje ?? 0;
    if (pb !== pa) return pb - pa;
    return precioNumero(a.price) - precioNumero(b.price);
  });
}

/**
 * Etiqueta legible del precio por unidad, ej. "$1.250 por W".
 * Se arma a mano y no con `style: 'currency'` para que el signo quede pegado al número,
 * como los precios del catálogo.
 */
export function etiquetaPrecioPorUnidad(r: ResultadoValor | undefined): string | null {
  if (!r || r.precioPorUnidad === null || !r.unidad) return null;
  return `$${r.precioPorUnidad.toLocaleString('es-CO')} por ${r.unidad}`;
}
