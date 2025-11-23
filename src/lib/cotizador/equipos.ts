// Base de datos de equipos solares
// Basado en el análisis del Excel "Cotizador (2.0).xlsm"

import type { Equipo } from './tipos';

// HSP (Horas Sol Pico) por ciudad - Datos de radiación solar de Colombia
// Estructura: { departamento: { ciudad: HSP } }
export const HSP_POR_CIUDAD: Record<string, Record<string, number>> = {
  'Antioquia': {
    'Medellín': 4.5,
    'Bello': 4.5,
    'Itagüí': 4.5,
    'Envigado': 4.5,
    'Sabaneta': 4.5,
    'La Ceja': 4.5,
    'Rionegro': 4.5,
    'Marinilla': 4.5,
    'El Retiro': 4.5,
    'Guarne': 4.5,
    'Copacabana': 4.5,
    'Girardota': 4.5,
    'Barbosa': 4.5,
    'Cisneros': 4.5,
    'Yondó': 5.0,
    'Puerto Berrío': 4.8,
    'Turbo': 5.1,
    'Apartadó': 5.1,
    'Carepa': 5.1,
    'Chigorodó': 5.0,
  },
  'Cundinamarca': {
    'Bogotá': 4.2,
    'Soacha': 4.2,
    'Chía': 4.2,
    'Zipaquirá': 4.2,
    'Facatativá': 4.2,
    'Girardot': 4.8,
    'Fusagasugá': 4.3,
    'Sibaté': 4.2,
    'Mosquera': 4.2,
    'Madrid': 4.2,
    'Funza': 4.2,
    'Cajicá': 4.2,
    'Tabio': 4.2,
    'Tenjo': 4.2,
  },
  'Valle del Cauca': {
    'Cali': 4.8,
    'Palmira': 4.8,
    'Buenaventura': 4.5,
    'Tuluá': 4.7,
    'Cartago': 4.6,
    'Buga': 4.7,
    'Yumbo': 4.8,
    'Ginebra': 4.7,
    'Guacarí': 4.7,
    'El Cerrito': 4.7,
    'Restrepo': 4.7,
    'La Cumbre': 4.6,
  },
  'Atlántico': {
    'Barranquilla': 5.2,
    'Soledad': 5.2,
    'Malambo': 5.2,
    'Sabanagrande': 5.2,
    'Puerto Colombia': 5.2,
    'Galapa': 5.2,
    'Tubará': 5.2,
    'Usiacurí': 5.2,
  },
  'Bolívar': {
    'Cartagena': 5.0,
    'Magangué': 5.1,
    'Turbaco': 5.0,
    'Arjona': 5.0,
    'Mahates': 5.0,
    'San Pablo': 5.0,
    'Santa Rosa': 5.0,
    'María la Baja': 5.0,
  },
  'Santander': {
    'Bucaramanga': 4.6,
    'Floridablanca': 4.6,
    'Girón': 4.6,
    'Piedecuesta': 4.6,
    'Barrancabermeja': 4.8,
    'San Gil': 4.5,
    'Socorro': 4.5,
    'Barbosa': 4.5,
  },
  'Risaralda': {
    'Pereira': 4.4,
    'Dosquebradas': 4.4,
    'Santa Rosa de Cabal': 4.4,
    'La Virginia': 4.5,
    'Cartago': 4.6,
    'Marsella': 4.4,
  },
  'Caldas': {
    'Manizales': 4.3,
    'La Dorada': 4.7,
    'Chinchiná': 4.3,
    'Palestina': 4.3,
    'Villamaría': 4.3,
    'Anserma': 4.4,
  },
  'Quindío': {
    'Armenia': 4.4,
    'Calarcá': 4.4,
    'La Tebaida': 4.4,
    'Montenegro': 4.4,
    'Quimbaya': 4.4,
    'Circasia': 4.4,
  },
  'Tolima': {
    'Ibagué': 4.5,
    'Espinal': 4.6,
    'Girardot': 4.8,
    'Melgar': 4.7,
    'Flandes': 4.7,
    'Guamo': 4.6,
  },
  'Magdalena': {
    'Santa Marta': 5.1,
    'Ciénaga': 5.1,
    'Fundación': 5.1,
    'Aracataca': 5.1,
    'El Banco': 5.0,
    'Plato': 5.0,
  },
  'Cesar': {
    'Valledupar': 5.3,
    'Aguachica': 5.2,
    'Codazzi': 5.2,
    'La Paz': 5.2,
    'San Diego': 5.2,
    'Curumaní': 5.2,
  },
  'Córdoba': {
    'Montería': 5.0,
    'Cereté': 5.0,
    'Sahagún': 5.0,
    'Lorica': 5.0,
    'Montelíbano': 5.0,
    'Planeta Rica': 5.0,
  },
  'Sucre': {
    'Sincelejo': 5.1,
    'Corozal': 5.1,
    'Sampués': 5.1,
    'San Onofre': 5.1,
    'Coveñas': 5.1,
    'Tolú': 5.1,
  },
  'Norte de Santander': {
    'Cúcuta': 4.8,
    'Villa del Rosario': 4.8,
    'Los Patios': 4.8,
    'El Zulia': 4.8,
    'San Cayetano': 4.8,
  },
  'Huila': {
    'Neiva': 4.7,
    'Pitalito': 4.6,
    'Garzón': 4.6,
    'La Plata': 4.6,
    'Campoalegre': 4.6,
  },
  'Cauca': {
    'Popayán': 4.5,
    'Santander de Quilichao': 4.6,
    'Puerto Tejada': 4.7,
    'Patía': 4.7,
    'Miranda': 4.6,
  },
  'Nariño': {
    'Pasto': 4.4,
    'Tumaco': 4.6,
    'Ipiales': 4.3,
    'Túquerres': 4.3,
    'La Unión': 4.4,
  },
  'Meta': {
    'Villavicencio': 4.6,
    'Acacías': 4.6,
    'Granada': 4.6,
    'San Martín': 4.6,
    'Restrepo': 4.6,
  },
  'Casanare': {
    'Yopal': 4.7,
    'Aguazul': 4.7,
    'Tauramena': 4.7,
    'Villanueva': 4.7,
  },
  'Arauca': {
    'Arauca': 5.0,
    'Saravena': 4.9,
    'Fortul': 4.9,
  },
  'Putumayo': {
    'Mocoa': 4.5,
    'Puerto Asís': 4.6,
    'Orito': 4.6,
  },
  'Amazonas': {
    'Leticia': 4.4,
    'Puerto Nariño': 4.4,
  },
  'Guainía': {
    'Inírida': 4.5,
  },
  'Guaviare': {
    'San José del Guaviare': 4.6,
  },
  'Vaupés': {
    'Mitú': 4.4,
  },
  'Vichada': {
    'Puerto Carreño': 5.0,
  },
  'La Guajira': {
    'Riohacha': 5.4,
    'Maicao': 5.4,
    'Uribia': 5.4,
    'Manaure': 5.4,
    'San Juan del Cesar': 5.3,
  },
  'Boyacá': {
    'Tunja': 4.3,
    'Duitama': 4.3,
    'Sogamoso': 4.3,
    'Chiquinquirá': 4.3,
    'Villa de Leyva': 4.3,
  },
  'Chocó': {
    'Quibdó': 4.2,
    'Istmina': 4.3,
    'Condoto': 4.3,
  },
};

// Lista de departamentos
export const DEPARTAMENTOS = Object.keys(HSP_POR_CIUDAD).sort();

// Función para obtener ciudades por departamento
export function obtenerCiudadesPorDepartamento(departamento: string): string[] {
  return Object.keys(HSP_POR_CIUDAD[departamento] || {}).sort();
}

// Factor de eficiencia del sistema (pérdidas por sombras, suciedad, etc.)
export const FACTOR_EFICIENCIA = 0.8;

// Base de datos de equipos
// Nota: Estos son valores de ejemplo. Se deben actualizar con los precios reales del Excel
export const EQUIPOS: Equipo[] = [
  // PANELES SOLARES
  {
    id: 'panel-585w',
    tipo: 'panel',
    categoria: 'paneles',
    nombre: 'Panel Solar Monocristalino 585W',
    descripcion: 'Panel solar Monocristalino HalfCell (585W)',
    marca: 'Longi',
    modelo: 'LR5-72HTH-585M',
    potencia: 585,
    voltaje: 44.21,
    corriente: 13.24,
    eficiencia: 22.6,
    dimensiones: {
      ancho: 1.134,
      largo: 2.278,
    },
    area: 2.583,
    precioUnitario: 380250,
    precioWp: 650,
    imagen: '/images/panel.jpg',
  },
  {
    id: 'panel-600w',
    tipo: 'panel',
    categoria: 'paneles',
    nombre: 'Panel Solar Monocristalino 600W',
    descripcion: 'Panel solar Monocristalino HalfCell (600W)',
    marca: 'Longi',
    modelo: 'LR5-72HTH-600M',
    potencia: 600,
    voltaje: 44.21,
    corriente: 13.57,
    eficiencia: 22.1,
    dimensiones: {
      ancho: 1.134,
      largo: 2.278,
    },
    area: 2.583,
    precioUnitario: 390000,
    precioWp: 650,
    imagen: '/images/panel.jpg',
  },
  {
    id: 'panel-550w',
    tipo: 'panel',
    categoria: 'paneles',
    nombre: 'Panel Solar Monocristalino 550W',
    descripcion: 'Panel solar Monocristalino (550W)',
    marca: 'Longi',
    modelo: 'LR5-72HTH-550M',
    potencia: 550,
    voltaje: 40.63,
    corriente: 13.54,
    eficiencia: 21.5,
    dimensiones: {
      ancho: 1.134,
      largo: 2.274,
    },
    area: 2.579,
    precioUnitario: 357500,
    precioWp: 650,
    imagen: '/images/panel.jpg',
  },
  {
    id: 'panel-500w',
    tipo: 'panel',
    categoria: 'paneles',
    nombre: 'Panel Solar Monocristalino 500W',
    descripcion: 'Panel solar Monocristalino (500W)',
    marca: 'Longi',
    modelo: 'LR5-72HTH-500M',
    potencia: 500,
    voltaje: 40.63,
    corriente: 12.31,
    eficiencia: 20.8,
    dimensiones: {
      ancho: 1.134,
      largo: 2.274,
    },
    area: 2.579,
    precioUnitario: 325000,
    precioWp: 650,
    imagen: '/images/panel.jpg',
  },
  
  // INVERSORES
  {
    id: 'inversor-hibrido-8kw',
    tipo: 'inversor',
    categoria: 'inversores',
    nombre: 'Inversor Híbrido 8 kW Split phase',
    descripcion: 'Inversor Híbrido (Deye) Sun 8kW Split phase',
    marca: 'Deye',
    modelo: 'Sun-8K-SG01LP1',
    potencia: 8, // kW
    voltaje: 48,
    eficiencia: 97.5,
    precioUnitario: 8500000,
    imagen: '/images/inversor.jpg',
  },
  {
    id: 'inversor-hibrido-5kw',
    tipo: 'inversor',
    categoria: 'inversores',
    nombre: 'Inversor Híbrido 5 kW',
    descripcion: 'Inversor Híbrido 5kW',
    marca: 'Deye',
    modelo: 'Sun-5K-SG01LP1',
    potencia: 5, // kW
    voltaje: 48,
    eficiencia: 97.5,
    precioUnitario: 6500000,
    imagen: '/images/inversor.jpg',
  },
  {
    id: 'inversor-hibrido-3kw',
    tipo: 'inversor',
    categoria: 'inversores',
    nombre: 'Inversor Híbrido 3 kW',
    descripcion: 'Inversor Híbrido 3kW',
    marca: 'Deye',
    modelo: 'Sun-3K-SG01LP1',
    potencia: 3, // kW
    voltaje: 48,
    eficiencia: 97.5,
    precioUnitario: 4500000,
    imagen: '/images/inversor.jpg',
  },
  {
    id: 'inversor-string-10kw',
    tipo: 'inversor',
    categoria: 'inversores',
    nombre: 'Inversor String 10 kW',
    descripcion: 'Inversor String 10kW',
    marca: 'Growatt',
    modelo: 'MIN 10000TL-X',
    potencia: 10, // kW
    voltaje: 400,
    eficiencia: 98.0,
    precioUnitario: 12000000,
    imagen: '/images/inversor.jpg',
  },
  {
    id: 'microinversor-2000w',
    tipo: 'inversor',
    categoria: 'inversores',
    nombre: 'Microinversor 2000W',
    descripcion: 'Microinversor 2000W',
    marca: 'Hoymiles',
    modelo: 'HM-2000',
    potencia: 2, // kW
    voltaje: 220,
    eficiencia: 97.5,
    precioUnitario: 1890000,
    imagen: '/images/inversor.jpg',
  },
  
  // BATERÍAS
  {
    id: 'bateria-litio-5kwh',
    tipo: 'bateria',
    categoria: 'baterias',
    nombre: 'Batería Litio US5000 48V',
    descripcion: 'Batería Litio US5000 48V Pylontech',
    marca: 'Pylontech',
    modelo: 'US5000',
    capacidad: 4.8, // kWh
    voltaje: 48,
    profundidadDescarga: 90,
    precioUnitario: 8500000,
    imagen: '/images/bateria.jpg',
  },
  {
    id: 'bateria-litio-3kwh',
    tipo: 'bateria',
    categoria: 'baterias',
    nombre: 'Batería Litio US3000 48V',
    descripcion: 'Batería Litio US3000 48V Pylontech',
    marca: 'Pylontech',
    modelo: 'US3000',
    capacidad: 3.5, // kWh
    voltaje: 48,
    profundidadDescarga: 90,
    precioUnitario: 6500000,
    imagen: '/images/bateria.jpg',
  },
  
  // CONTROLADORES
  {
    id: 'controlador-mppt-100a',
    tipo: 'controlador',
    categoria: 'controladores',
    nombre: 'Controlador MPPT 100A',
    descripcion: 'BlueSolar MPPT 150/70-MC4 Victron Energy',
    marca: 'Victron Energy',
    modelo: 'BlueSolar MPPT 150/70',
    corriente: 100,
    voltaje: 48,
    eficiencia: 98,
    precioUnitario: 2500000,
    imagen: '/images/controlador.jpg',
  },
  {
    id: 'controlador-mppt-60a',
    tipo: 'controlador',
    categoria: 'controladores',
    nombre: 'Controlador MPPT 60A',
    descripcion: 'BlueSolar MPPT 100/50-MC4 Victron Energy',
    marca: 'Victron Energy',
    modelo: 'BlueSolar MPPT 100/50',
    corriente: 60,
    voltaje: 48,
    eficiencia: 98,
    precioUnitario: 1800000,
    imagen: '/images/controlador.jpg',
  },
  {
    id: 'controlador-mppt-40a',
    tipo: 'controlador',
    categoria: 'controladores',
    nombre: 'Controlador MPPT 40A',
    descripcion: 'BlueSolar MPPT 75/50-MC4 Victron Energy',
    marca: 'Victron Energy',
    modelo: 'BlueSolar MPPT 75/50',
    corriente: 40,
    voltaje: 48,
    eficiencia: 98,
    precioUnitario: 1200000,
    imagen: '/images/controlador.jpg',
  },
  
  // ESTRUCTURAS Y ACCESORIOS
  {
    id: 'estructura-techo',
    tipo: 'estructura',
    categoria: 'estructuras',
    nombre: 'Estructura para paneles solares',
    descripcion: 'Estructura para paneles solares con sus accesorios',
    marca: 'Alurack',
    modelo: 'Estructura tipo L',
    precioUnitario: 350000, // Por panel aproximadamente
    imagen: '/images/estructura.jpg',
  },
  {
    id: 'tablero-proteccion',
    tipo: 'accesorio',
    categoria: 'accesorios',
    nombre: 'Tablero de protección',
    descripcion: 'Accesorios, Tablero de protección con cajas, fusibles, breakers',
    marca: 'Genérico',
    modelo: 'Tablero estándar',
    precioUnitario: 500000,
    imagen: '/images/tablero.jpg',
  },
  {
    id: 'instalacion',
    tipo: 'accesorio',
    categoria: 'instalacion',
    nombre: 'Instalación y puesta en marcha',
    descripcion: 'Instalación, transporte, supervisión y puesta en marcha',
    marca: 'Servicio',
    modelo: 'Instalación completa',
    precioUnitario: 0, // Se calcula como % del total
    imagen: '/images/instalacion.jpg',
  },
  {
    id: 'certificacion-retie',
    tipo: 'accesorio',
    categoria: 'certificacion',
    nombre: 'Certificación RETIE',
    descripcion: 'Servicio de certificación de cumplimiento RETIE',
    marca: 'Servicio',
    modelo: 'Certificación',
    precioUnitario: 800000,
    imagen: '/images/certificacion.jpg',
  },
];

// Funciones auxiliares
export function obtenerEquipoPorId(id: string): Equipo | undefined {
  return EQUIPOS.find(e => e.id === id);
}

export function obtenerEquiposPorTipo(tipo: Equipo['tipo']): Equipo[] {
  return EQUIPOS.filter(e => e.tipo === tipo);
}

export function obtenerEquiposPorCategoria(categoria: string): Equipo[] {
  return EQUIPOS.filter(e => e.categoria === categoria);
}

export function obtenerHSPPorCiudad(ciudad: string, departamento?: string): number {
  if (departamento && HSP_POR_CIUDAD[departamento] && HSP_POR_CIUDAD[departamento][ciudad]) {
    return HSP_POR_CIUDAD[departamento][ciudad];
  }
  
  // Buscar en todos los departamentos si no se especifica
  for (const dept of Object.keys(HSP_POR_CIUDAD)) {
    if (HSP_POR_CIUDAD[dept][ciudad]) {
      return HSP_POR_CIUDAD[dept][ciudad];
    }
  }
  
  return 4.5; // Default para ciudades no listadas
}

