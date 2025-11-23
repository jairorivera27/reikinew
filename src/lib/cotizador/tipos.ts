// Tipos TypeScript para el cotizador solar

export type TipoSistema = 'on-grid' | 'off-grid' | 'hibrido';
export type TipoCliente = 'residencial' | 'comercial' | 'industrial' | 'oficial';
export type TipoEquipo = 'panel' | 'inversor' | 'bateria' | 'controlador' | 'estructura' | 'accesorio';
export type ModeloNegocio = 'epc' | 'ppa'; // EPC = inversión total, PPA = sin inversión inicial

export interface Equipo {
  id: string;
  tipo: TipoEquipo;
  categoria: string;
  nombre: string;
  descripcion: string;
  marca: string;
  modelo: string;
  
  // Especificaciones técnicas
  potencia?: number; // W para paneles, kW para inversores
  voltaje?: number;
  corriente?: number;
  eficiencia?: number;
  dimensiones?: {
    ancho: number; // m
    largo: number; // m
    alto?: number; // m
  };
  area?: number; // m²
  
  // Precios
  precioUnitario: number; // COP
  precioWp?: number; // Para paneles (COP/Wp)
  
  // Imagen
  imagen?: string;
  
  // Compatibilidad y especificaciones adicionales
  voltajeMinimo?: number;
  voltajeMaximo?: number;
  corrienteMaxima?: number;
  profundidadDescarga?: number; // Para baterías (%)
  capacidad?: number; // Para baterías (kWh o Ah)
  
  // Compatibilidad
  compatibilidad?: string[];
}

export interface DatosCliente {
  nombre: string;
  nit?: string;
  email: string;
  telefono: string;
  direccion?: string;
  ciudad: string;
  tipoCliente: TipoCliente;
}

export interface DatosProyectoOnGrid {
  tipoSistema: 'on-grid';
  consumosMensuales: number[]; // 12 valores (enero a diciembre) o promedio
  tarifaElectrica: number; // $/kWh
  porcentajeAutoconsumo: number; // 0-100
  tipoCubierta?: string;
  tipoAcometida?: string;
  pagaContribucion?: boolean;
  propiedadTransformador?: 'propio' | 'compartido';
  tarifaVentaExcedentes?: number; // $/kWh
}

export interface DatosProyectoOffGrid {
  tipoSistema: 'off-grid';
  consumoDiario: number; // kWh/día
  diasAutonomia: number;
  voltajeSistema: 12 | 24 | 48;
  tipoConsumo: 'solo-dia' | 'dia-noche' | '24h';
  profundidadDescarga?: number; // % (default 50%)
}

export interface DatosProyectoHibrido {
  tipoSistema: 'hibrido';
  consumosMensuales: number[];
  tarifaElectrica: number;
  porcentajeAutoconsumo: number;
  consumoDiario: number;
  diasAutonomia: number;
  voltajeSistema: 12 | 24 | 48;
}

export type DatosProyecto = DatosProyectoOnGrid | DatosProyectoOffGrid | DatosProyectoHibrido;

export interface EquipoSeleccionado {
  equipoId: string;
  cantidad: number;
  descuento?: number; // % (0-100)
  precioUnitarioPersonalizado?: number; // Si se modifica el precio
}

export interface Cotizacion {
  id: string;
  numero: string;
  fecha: Date;
  validez: number; // días
  
  cliente: DatosCliente;
  proyecto: DatosProyecto;
  
  equiposSeleccionados: EquipoSeleccionado[];
  
  // Cálculos
  potenciaInstalada?: number; // kWp
  cantidadPaneles?: number;
  generacionAnual?: number; // kWh/año
  ahorroAnual?: number; // COP/año
  
  // Totales
  subtotal: number;
  descuentoGeneral: number; // %
  subtotalConDescuento: number;
  iva: number; // 19%
  total: number;
  
  // Análisis financiero
  añosRecuperacion?: number;
  tir?: number; // 0-1 (ej: 0.15 = 15%)
  van?: number;
  roi?: number; // %
}

export interface FlujoCaja {
  año: number;
  inversionInicial?: number;
  ahorroAnual: number;
  opex?: number; // Operación y mantenimiento
  flujoNeto: number;
  flujoAcumulado: number;
  degradacion?: number; // % de degradación acumulada
}

export interface ResultadoCalculo {
  potenciaNecesaria: number; // kWp
  cantidadPaneles: number;
  potenciaInstalada: number; // kWp
  generacionAnual: number; // kWh/año
  generacionMensual: number[]; // 12 valores
  ahorroAnual: number; // COP/año
  ahorroMensual: number; // COP/mes
  energiaAutoconsumo?: number; // kWh/año (On-Grid)
  energiaExcedente?: number; // kWh/año (On-Grid)
  capacidadBateria?: number; // kWh (Off-Grid/Híbrido)
  areaNecesaria?: number; // m²
}

export interface FlujoCaja {
  año: number;
  inversionInicial?: number;
  ahorroAnual: number;
  opex?: number; // Operación y mantenimiento
  flujoNeto: number;
  flujoAcumulado: number;
  degradacion?: number; // % de degradación de paneles
}

