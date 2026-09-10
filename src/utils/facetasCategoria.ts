/**
 * Rangos y opciones disponibles para los filtros de una categoría.
 *
 * Se calculan sobre la categoría completa, no sobre la página visible, para que los
 * controles ofrezcan siempre las marcas y los rangos reales del catálogo.
 */
import { precioNumero, type ResultadoValor } from './calidadPrecio';
import { detectarTipoInversor } from './productCardCompactMeta';

export interface FacetasCategoria {
  marcas: { nombre: string; conteo: number }[];
  /** Solo inversores: On-Grid, Off-Grid, Híbrido. */
  tiposInversor: { nombre: string; conteo: number }[];
  precioMin: number;
  precioMax: number;
  potenciaMin: number | null;
  potenciaMax: number | null;
  unidad: string | null;
  total: number;
  hayAgotados: boolean;
}

interface ProductoFaceteable {
  slug: string;
  data: {
    title?: string;
    brand?: string;
    model?: string;
    category?: string;
    price: string;
    stock?: string;
  };
}

/** Agrupa microinversores con On-Grid, que es como el comprador los busca. */
export function tipoInversorParaFiltro(
  title: string,
  model?: string,
  brand?: string
): 'On-Grid' | 'Off-Grid' | 'Híbrido' {
  const tipo = detectarTipoInversor(title, model, brand);
  if (tipo === 'Off-Grid') return 'Off-Grid';
  if (tipo === 'Híbrido') return 'Híbrido';
  return 'On-Grid'; // On-Grid, Microinversor o desconocido
}

export function calcularFacetas(
  productos: ProductoFaceteable[],
  valores: Map<string, ResultadoValor>
): FacetasCategoria {
  const conteoMarcas = new Map<string, number>();
  const conteoTipos = new Map<string, number>();
  let precioMin = Infinity;
  let precioMax = 0;
  let potenciaMin: number | null = null;
  let potenciaMax: number | null = null;
  let hayAgotados = false;
  let esInversores = false;

  for (const p of productos) {
    if (p.data.category === 'inversores') esInversores = true;

    const marca = p.data.brand?.trim();
    // "Sin marca" no es una marca útil para filtrar; no la listamos en el panel.
    if (marca && !/^sin marca$/i.test(marca)) {
      conteoMarcas.set(marca, (conteoMarcas.get(marca) ?? 0) + 1);
    }

    if (p.data.category === 'inversores' && p.data.title) {
      const tipo = tipoInversorParaFiltro(p.data.title, p.data.model, p.data.brand);
      conteoTipos.set(tipo, (conteoTipos.get(tipo) ?? 0) + 1);
    }

    const precio = precioNumero(p.data.price);
    if (precio > 0) {
      precioMin = Math.min(precioMin, precio);
      precioMax = Math.max(precioMax, precio);
    }

    const magnitud = valores.get(p.slug)?.magnitud ?? null;
    if (magnitud !== null) {
      potenciaMin = potenciaMin === null ? magnitud : Math.min(potenciaMin, magnitud);
      potenciaMax = potenciaMax === null ? magnitud : Math.max(potenciaMax, magnitud);
    }

    if ((p.data.stock ?? 'disponible') !== 'disponible') hayAgotados = true;
  }

  const ordenTipos = ['On-Grid', 'Off-Grid', 'Híbrido'];

  return {
    marcas: [...conteoMarcas.entries()]
      .map(([nombre, conteo]) => ({ nombre, conteo }))
      .sort((a, b) => b.conteo - a.conteo || a.nombre.localeCompare(b.nombre, 'es')),
    tiposInversor: esInversores
      ? ordenTipos
          .filter((nombre) => (conteoTipos.get(nombre) ?? 0) > 0)
          .map((nombre) => ({ nombre, conteo: conteoTipos.get(nombre) ?? 0 }))
      : [],
    precioMin: precioMin === Infinity ? 0 : precioMin,
    precioMax,
    potenciaMin: potenciaMin === null ? null : Math.floor(potenciaMin),
    potenciaMax: potenciaMax === null ? null : Math.ceil(potenciaMax),
    unidad: [...valores.values()].find((v) => v.unidad !== null)?.unidad ?? null,
    total: productos.length,
    hayAgotados,
  };
}
