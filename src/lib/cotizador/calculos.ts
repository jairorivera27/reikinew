// Funciones de cálculo para el cotizador solar
// Basado en las fórmulas del Excel "Cotizador (2.0).xlsm"

import type {
  DatosProyecto,
  DatosProyectoOnGrid,
  DatosProyectoOffGrid,
  ResultadoCalculo,
  Equipo,
} from './tipos';
import { obtenerHSPPorCiudad, FACTOR_EFICIENCIA } from './equipos';

/**
 * Calcula el consumo anual a partir de consumos mensuales
 */
export function calcularConsumoAnual(consumosMensuales: number[]): number {
  if (consumosMensuales.length === 12) {
    return consumosMensuales.reduce((sum, consumo) => sum + consumo, 0);
  } else if (consumosMensuales.length === 1) {
    // Si solo hay un valor, asumir que es el promedio mensual
    return consumosMensuales[0] * 12;
  }
  // Si hay varios valores pero no 12, calcular promedio
  const promedio = consumosMensuales.reduce((sum, c) => sum + c, 0) / consumosMensuales.length;
  return promedio * 12;
}

/**
 * Calcula la potencia necesaria para un sistema On-Grid
 */
export function calcularPotenciaNecesariaOnGrid(
  consumoAnual: number,
  hsp: number,
  factorEficiencia: number = FACTOR_EFICIENCIA
): number {
  // Potencia (kWp) = Consumo Anual (kWh) / (HSP * 365 * Factor de Eficiencia)
  return consumoAnual / (hsp * 365 * factorEficiencia);
}

/**
 * Calcula la cantidad de paneles necesarios
 */
export function calcularCantidadPaneles(
  potenciaNecesaria: number,
  potenciaPanel: number
): number {
  return Math.ceil(potenciaNecesaria / potenciaPanel);
}

/**
 * Calcula la generación anual de energía
 */
export function calcularGeneracionAnual(
  potenciaInstalada: number,
  hsp: number,
  factorEficiencia: number = FACTOR_EFICIENCIA
): number {
  // Generación (kWh/año) = Potencia Instalada (kWp) * HSP * 365 * Factor de Eficiencia
  return potenciaInstalada * hsp * 365 * factorEficiencia;
}

/**
 * Calcula la generación mensual (distribución aproximada)
 */
export function calcularGeneracionMensual(
  generacionAnual: number,
  hsp: number
): number[] {
  // Distribución mensual basada en HSP promedio
  // Valores aproximados para Colombia (mayor generación en meses secos)
  const distribucionMensual = [
    0.08,  // Enero
    0.08,  // Febrero
    0.08,  // Marzo
    0.08,  // Abril
    0.09,  // Mayo
    0.09,  // Junio
    0.09,  // Julio
    0.09,  // Agosto
    0.08,  // Septiembre
    0.08,  // Octubre
    0.08,  // Noviembre
    0.08,  // Diciembre
  ];
  
  return distribucionMensual.map(factor => generacionAnual * factor);
}

/**
 * Calcula el ahorro anual para sistema On-Grid
 */
export function calcularAhorroAnualOnGrid(
  generacionAnual: number,
  porcentajeAutoconsumo: number,
  tarifaElectrica: number,
  tarifaVentaExcedentes?: number
): {
  energiaAutoconsumo: number;
  energiaExcedente: number;
  ahorroAnual: number;
} {
  const energiaAutoconsumo = generacionAnual * (porcentajeAutoconsumo / 100);
  const energiaExcedente = generacionAnual - energiaAutoconsumo;
  
  // Ahorro por autoconsumo
  const ahorroAutoconsumo = energiaAutoconsumo * tarifaElectrica;
  
  // Ingreso por venta de excedentes (si aplica)
  const tarifaVenta = tarifaVentaExcedentes || tarifaElectrica * 0.9; // 90% de la tarifa si no se especifica
  const ingresoExcedentes = energiaExcedente * tarifaVenta;
  
  const ahorroAnual = ahorroAutoconsumo + ingresoExcedentes;
  
  return {
    energiaAutoconsumo,
    energiaExcedente,
    ahorroAnual,
  };
}

/**
 * Calcula la capacidad de batería necesaria para Off-Grid
 */
export function calcularCapacidadBateria(
  consumoDiario: number,
  diasAutonomia: number,
  voltajeSistema: number,
  profundidadDescarga: number = 50 // %
): number {
  // Capacidad (kWh) = (Consumo Diario * Días Autonomía) / (Profundidad Descarga / 100)
  const capacidadKWh = (consumoDiario * diasAutonomia) / (profundidadDescarga / 100);
  
  // Convertir a Ah si es necesario
  // Capacidad (Ah) = Capacidad (kWh) * 1000 / Voltaje
  const capacidadAh = (capacidadKWh * 1000) / voltajeSistema;
  
  return capacidadKWh;
}

/**
 * Calcula la potencia necesaria para un sistema Off-Grid
 */
export function calcularPotenciaNecesariaOffGrid(
  consumoDiario: number,
  hsp: number,
  factorEficiencia: number = FACTOR_EFICIENCIA
): number {
  // Potencia (kWp) = Consumo Diario (kWh) / (HSP * Factor de Eficiencia)
  return consumoDiario / (hsp * factorEficiencia);
}

/**
 * Calcula el área necesaria para instalar los paneles
 */
export function calcularAreaNecesaria(
  cantidadPaneles: number,
  areaPorPanel: number,
  factorSeguridad: number = 1.2 // 20% adicional para espacios entre paneles
): number {
  return cantidadPaneles * areaPorPanel * factorSeguridad;
}

/**
 * Función principal de cálculo para sistema On-Grid
 */
export function calcularSistemaOnGrid(
  proyecto: DatosProyectoOnGrid,
  panel: Equipo,
  ciudad: string
): ResultadoCalculo {
  const hsp = obtenerHSPPorCiudad(ciudad);
  const consumoAnual = calcularConsumoAnual(proyecto.consumosMensuales);
  
  // Calcular potencia necesaria
  const potenciaNecesaria = calcularPotenciaNecesariaOnGrid(consumoAnual, hsp);
  
  // Calcular cantidad de paneles
  const potenciaPanel = (panel.potencia || 0) / 1000; // Convertir W a kW
  const cantidadPaneles = calcularCantidadPaneles(potenciaNecesaria, potenciaPanel);
  
  // Potencia instalada real
  const potenciaInstalada = cantidadPaneles * potenciaPanel;
  
  // Calcular generación
  const generacionAnual = calcularGeneracionAnual(potenciaInstalada, hsp);
  const generacionMensual = calcularGeneracionMensual(generacionAnual, hsp);
  
  // Calcular ahorro
  const { energiaAutoconsumo, energiaExcedente, ahorroAnual } = calcularAhorroAnualOnGrid(
    generacionAnual,
    proyecto.porcentajeAutoconsumo,
    proyecto.tarifaElectrica,
    proyecto.tarifaVentaExcedentes
  );
  
  // Calcular área
  const areaNecesaria = panel.area
    ? calcularAreaNecesaria(cantidadPaneles, panel.area)
    : undefined;
  
  return {
    potenciaNecesaria,
    cantidadPaneles,
    potenciaInstalada,
    generacionAnual,
    generacionMensual,
    ahorroAnual,
    ahorroMensual: ahorroAnual / 12,
    energiaAutoconsumo,
    energiaExcedente,
    areaNecesaria,
  };
}

/**
 * Función principal de cálculo para sistema Off-Grid
 */
export function calcularSistemaOffGrid(
  proyecto: DatosProyectoOffGrid,
  panel: Equipo,
  ciudad: string
): ResultadoCalculo {
  const hsp = obtenerHSPPorCiudad(ciudad);
  
  // Calcular potencia necesaria
  const potenciaNecesaria = calcularPotenciaNecesariaOffGrid(
    proyecto.consumoDiario,
    hsp
  );
  
  // Calcular cantidad de paneles
  const potenciaPanel = (panel.potencia || 0) / 1000; // Convertir W a kW
  const cantidadPaneles = calcularCantidadPaneles(potenciaNecesaria, potenciaPanel);
  
  // Potencia instalada real
  const potenciaInstalada = cantidadPaneles * potenciaPanel;
  
  // Calcular generación
  const generacionAnual = calcularGeneracionAnual(potenciaInstalada, hsp);
  const generacionMensual = calcularGeneracionMensual(generacionAnual, hsp);
  
  // Calcular capacidad de batería
  const capacidadBateria = calcularCapacidadBateria(
    proyecto.consumoDiario,
    proyecto.diasAutonomia,
    proyecto.voltajeSistema,
    proyecto.profundidadDescarga
  );
  
  // Calcular área
  const areaNecesaria = panel.area
    ? calcularAreaNecesaria(cantidadPaneles, panel.area)
    : undefined;
  
  // Para Off-Grid no hay ahorro en términos de factura eléctrica
  // pero se puede calcular el valor de la energía generada
  return {
    potenciaNecesaria,
    cantidadPaneles,
    potenciaInstalada,
    generacionAnual,
    generacionMensual,
    ahorroAnual: 0, // Se calcula diferente para Off-Grid
    ahorroMensual: 0,
    capacidadBateria,
    areaNecesaria,
  };
}

/**
 * Función principal de cálculo (dispatcher)
 */
export function calcularSistema(
  proyecto: DatosProyecto,
  panel: Equipo,
  ciudad: string
): ResultadoCalculo {
  if (proyecto.tipoSistema === 'on-grid') {
    return calcularSistemaOnGrid(proyecto, panel, ciudad);
  } else if (proyecto.tipoSistema === 'off-grid') {
    return calcularSistemaOffGrid(proyecto, panel, ciudad);
  } else {
    // Híbrido: combinar lógica de On-Grid y Off-Grid
    // Por ahora, usar lógica On-Grid como base
    const proyectoOnGrid: DatosProyectoOnGrid = {
      tipoSistema: 'on-grid',
      consumosMensuales: proyecto.consumosMensuales,
      tarifaElectrica: proyecto.tarifaElectrica,
      porcentajeAutoconsumo: proyecto.porcentajeAutoconsumo,
    };
    return calcularSistemaOnGrid(proyectoOnGrid, panel, ciudad);
  }
}

