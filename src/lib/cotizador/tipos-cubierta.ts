// Tipos de cubierta y precios de estructuras
// Basado en el análisis del Excel "Cotizador (2.0).xlsm"

export type TipoCubierta = 
  | 'teja-barro'
  | 'teja-ondulada'
  | 'teja-zinc'
  | 'teja-trapezoidal'
  | 'loza'
  | 'estructura-elevada'
  | 'alurack-l'
  | 'terreno';

export interface CubiertaInfo {
  id: TipoCubierta;
  nombre: string;
  descripcion: string;
  precioPorPanel: number; // COP por panel
  precioProyectoPequeno?: number; // COP para proyectos pequeños
}

export const TIPOS_CUBIERTA: Record<TipoCubierta, CubiertaInfo> = {
  'teja-barro': {
    id: 'teja-barro',
    nombre: 'Teja de Barro',
    descripcion: 'Estructura para techo con teja de barro',
    precioPorPanel: 220000,
    precioProyectoPequeno: 237600,
  },
  'teja-ondulada': {
    id: 'teja-ondulada',
    nombre: 'Teja Ondulada o Fibrocemento',
    descripcion: 'Estructura para techo con teja ondulada o fibrocemento',
    precioPorPanel: 180000,
    precioProyectoPequeno: 194400,
  },
  'teja-zinc': {
    id: 'teja-zinc',
    nombre: 'Teja de Zinc',
    descripcion: 'Estructura para techo con teja de zinc',
    precioPorPanel: 200000, // Estimado basado en otros tipos
    precioProyectoPequeno: 216000,
  },
  'teja-trapezoidal': {
    id: 'teja-trapezoidal',
    nombre: 'Teja Trapezoidal',
    descripcion: 'Estructura para techo con teja trapezoidal',
    precioPorPanel: 200000, // Estimado
    precioProyectoPequeno: 216000,
  },
  'loza': {
    id: 'loza',
    nombre: 'Loza',
    descripcion: 'Estructura para loza de concreto',
    precioPorPanel: 210000, // Estimado
    precioProyectoPequeno: 226800,
  },
  'estructura-elevada': {
    id: 'estructura-elevada',
    nombre: 'Estructura Elevada (Columnetas)',
    descripcion: 'Estructura elevada con columnetas para terreno',
    precioPorPanel: 240000,
    precioProyectoPequeno: 259200,
  },
  'alurack-l': {
    id: 'alurack-l',
    nombre: 'Alurack con "L"',
    descripcion: 'Estructura Alurack tipo L para techo',
    precioPorPanel: 220000, // Similar a teja de barro
    precioProyectoPequeno: 237600,
  },
  'terreno': {
    id: 'terreno',
    nombre: 'Terreno',
    descripcion: 'Estructura para instalación en terreno',
    precioPorPanel: 240000, // Similar a estructura elevada
    precioProyectoPequeno: 259200,
  },
};

/**
 * Obtiene el precio de la estructura según el tipo de cubierta y cantidad de paneles
 */
export function obtenerPrecioEstructura(
  tipoCubierta: TipoCubierta | string,
  cantidadPaneles: number
): number {
  const cubierta = TIPOS_CUBIERTA[tipoCubierta as TipoCubierta];
  
  if (!cubierta) {
    // Precio por defecto si no se especifica
    return 220000 * cantidadPaneles;
  }
  
  // Para proyectos pequeños (menos de 10 paneles), usar precio especial si existe
  if (cantidadPaneles < 10 && cubierta.precioProyectoPequeno) {
    return cubierta.precioProyectoPequeno * cantidadPaneles;
  }
  
  return cubierta.precioPorPanel * cantidadPaneles;
}

/**
 * Obtiene información de la cubierta
 */
export function obtenerInfoCubierta(tipoCubierta: TipoCubierta | string): CubiertaInfo | null {
  return TIPOS_CUBIERTA[tipoCubierta as TipoCubierta] || null;
}

