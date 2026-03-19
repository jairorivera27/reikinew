// Funciones de análisis financiero para el cotizador solar

import type { FlujoCaja } from './tipos';

export interface AnalisisFinanciero {
  inversionInicial: number;
  añosRecuperacion: number;
  tir: number; // 0-1 (ej: 0.15 = 15%)
  van: number;
  roi: number; // %
  flujoCaja: FlujoCaja[];
  ahorroTotal25Anos: number;
}

export interface ParametrosFinancieros {
  tasaDescuento?: number; // Tasa de descuento para VAN (default: 10%)
  tasaInflacionTarifa?: number; // Inflación anual de la tarifa eléctrica (default: 4%)
  degradacionPaneles?: number; // Degradación anual de paneles (default: 0.5%)
  opexAnual?: number; // Operación y mantenimiento anual (default: 0.5% de inversión)
  vidaUtil?: number; // Vida útil del sistema en años (default: 25)
  tasaImpuesto?: number; // Tasa de impuesto a la renta (default: 35%)
  deduccionPorcentaje?: number; // Deducción del 50% del valor del proyecto (default: 50%)
  anosDepreciacion?: number; // Años de depreciación acelerada (default: 5)
}

const PARAMETROS_DEFAULT: ParametrosFinancieros = {
  tasaDescuento: 0.10, // 10%
  tasaInflacionTarifa: 0.04, // 4%
  degradacionPaneles: 0.005, // 0.5%
  opexAnual: 0.005, // 0.5% de la inversión
  vidaUtil: 25,
  tasaImpuesto: 0.35, // 35%
  deduccionPorcentaje: 0.50, // 50%
  anosDepreciacion: 5,
};

/**
 * Calcula el flujo de caja a 25 años para un sistema On-Grid
 */
export function calcularFlujoCaja(
  inversionInicial: number,
  ahorroAnualInicial: number,
  parametros: ParametrosFinancieros = {}
): FlujoCaja[] {
  const params = { ...PARAMETROS_DEFAULT, ...parametros };
  const flujoCaja: FlujoCaja[] = [];
  
  // Beneficio tributario por deducción del 50%
  const beneficioDeduccion = inversionInicial * params.deduccionPorcentaje! * params.tasaImpuesto!;
  
  // Depreciación anual
  const depreciacionAnual = inversionInicial / params.anosDepreciacion!;
  const ahorroFiscalDepreciacion = depreciacionAnual * params.tasaImpuesto!;
  
  // OPEX anual (operación y mantenimiento)
  const opexAnual = inversionInicial * params.opexAnual!;
  
  // Año 0: Inversión inicial
  flujoCaja.push({
    año: 0,
    inversionInicial: -inversionInicial,
    ahorroAnual: 0,
    opex: 0,
    flujoNeto: -inversionInicial,
    flujoAcumulado: -inversionInicial,
  });
  
  let flujoAcumulado = -inversionInicial;
  let ahorroAnual = ahorroAnualInicial;
  
  // Años 1-25
  for (let año = 1; año <= params.vidaUtil!; año++) {
    // Aplicar degradación de paneles
    const factorDegradacion = Math.pow(1 - params.degradacionPaneles!, año - 1);
    ahorroAnual = ahorroAnualInicial * factorDegradacion;
    
    // Aplicar inflación a la tarifa (aumenta el ahorro)
    const factorInflacion = Math.pow(1 + params.tasaInflacionTarifa!, año - 1);
    const ahorroAnualAjustado = ahorroAnual * factorInflacion;
    
    // Calcular flujo de caja
    let flujoNeto = ahorroAnualAjustado - opexAnual;
    
    // Año 1: incluye beneficio de deducción
    if (año === 1) {
      flujoNeto += beneficioDeduccion;
    }
    
    // Años 2-5: incluyen ahorro fiscal por depreciación
    if (año >= 2 && año <= params.anosDepreciacion!) {
      flujoNeto += ahorroFiscalDepreciacion;
    }
    
    flujoAcumulado += flujoNeto;
    
    flujoCaja.push({
      año,
      ahorroAnual: ahorroAnualAjustado,
      opex: opexAnual,
      flujoNeto,
      flujoAcumulado,
      degradacion: (1 - factorDegradacion) * 100, // % de degradación acumulada
    });
  }
  
  return flujoCaja;
}

/**
 * Calcula los años de recuperación de la inversión
 */
export function calcularAñosRecuperacion(
  flujoCaja: FlujoCaja[]
): number {
  // Buscar el año donde el flujo acumulado se vuelve positivo
  for (let i = 1; i < flujoCaja.length; i++) {
    const flujo = flujoCaja[i];
    if (flujo.flujoAcumulado >= 0) {
      // Si el flujo acumulado es positivo, calcular la fracción del año
      if (i === 1) {
        // Se recupera en el primer año
        const flujoAno1 = flujo.flujoNeto;
        const inversionInicial = Math.abs(flujoCaja[0].flujoNeto);
        return inversionInicial / flujoAno1;
      } else {
        // Calcular fracción del año
        const flujoAnterior = flujoCaja[i - 1];
        const flujoActual = flujo;
        const inversionRestante = Math.abs(flujoAnterior.flujoAcumulado);
        const flujoAno = flujoActual.flujoNeto;
        return flujoAnterior.año + (inversionRestante / flujoAno);
      }
    }
  }
  
  // Si no se recupera en 25 años, retornar un valor alto
  return 999;
}

/**
 * Calcula el VAN (Valor Actual Neto)
 */
export function calcularVAN(
  flujoCaja: FlujoCaja[],
  tasaDescuento: number = 0.10
): number {
  let van = 0;
  
  for (const flujo of flujoCaja) {
    const valorActual = flujo.flujoNeto / Math.pow(1 + tasaDescuento, flujo.año);
    van += valorActual;
  }
  
  return van;
}

/**
 * Calcula la TIR (Tasa Interna de Retorno) usando método de bisección
 */
export function calcularTIR(flujoCaja: FlujoCaja[]): number {
  // Función para calcular VAN con una tasa dada
  function calcularVANConTasa(tasa: number): number {
    let van = 0;
    for (const flujo of flujoCaja) {
      const valorActual = flujo.flujoNeto / Math.pow(1 + tasa, flujo.año);
      van += valorActual;
    }
    return van;
  }
  
  // Método de bisección para encontrar TIR (donde VAN = 0)
  let tasaBaja = -0.99; // -99% (límite inferior)
  let tasaAlta = 2.0; // 200% (límite superior)
  const tolerancia = 0.0001;
  const maxIteraciones = 100;
  
  let iteraciones = 0;
  
  while (iteraciones < maxIteraciones) {
    const tasaMedia = (tasaBaja + tasaAlta) / 2;
    const vanMedia = calcularVANConTasa(tasaMedia);
    
    if (Math.abs(vanMedia) < tolerancia) {
      return tasaMedia;
    }
    
    const vanBaja = calcularVANConTasa(tasaBaja);
    
    if (vanBaja * vanMedia < 0) {
      tasaAlta = tasaMedia;
    } else {
      tasaBaja = tasaMedia;
    }
    
    iteraciones++;
  }
  
  // Si no converge, retornar la tasa media
  return (tasaBaja + tasaAlta) / 2;
}

/**
 * Calcula el ROI (Retorno de Inversión)
 */
export function calcularROI(
  inversionInicial: number,
  flujoCaja: FlujoCaja[]
): number {
  // Sumar todos los flujos positivos (ahorros)
  const ahorroTotal = flujoCaja
    .filter(f => f.año > 0)
    .reduce((sum, f) => sum + f.ahorroAnual, 0);
  
  // Calcular ROI
  const roi = ((ahorroTotal - inversionInicial) / inversionInicial) * 100;
  
  return roi;
}

/**
 * Calcula el análisis financiero completo
 */
export function calcularAnalisisFinanciero(
  inversionInicial: number,
  ahorroAnualInicial: number,
  parametros: ParametrosFinancieros = {}
): AnalisisFinanciero {
  // Calcular flujo de caja
  const flujoCaja = calcularFlujoCaja(inversionInicial, ahorroAnualInicial, parametros);
  
  // Calcular métricas financieras
  const añosRecuperacion = calcularAñosRecuperacion(flujoCaja);
  const params = { ...PARAMETROS_DEFAULT, ...parametros };
  const van = calcularVAN(flujoCaja, params.tasaDescuento);
  const tir = calcularTIR(flujoCaja);
  const roi = calcularROI(inversionInicial, flujoCaja);
  
  // Calcular ahorro total a 25 años
  const ahorroTotal25Anos = flujoCaja
    .filter(f => f.año > 0)
    .reduce((sum, f) => sum + f.ahorroAnual, 0);
  
  return {
    inversionInicial,
    añosRecuperacion,
    tir,
    van,
    roi,
    flujoCaja,
    ahorroTotal25Anos,
  };
}

/**
 * Calcula el impacto ambiental (CO2 evitado)
 */
export function calcularImpactoAmbiental(
  generacionAnual: number, // kWh/año
  factorEmisionCO2: number = 0.267 // kg CO2/kWh (promedio Colombia)
): {
  co2EvitadoAnual: number; // kg CO2/año
  co2Evitado25Anos: number; // kg CO2 en 25 años
  equivalenteArboles: number; // árboles plantados
  equivalenteAutos: number; // autos retirados
} {
  // CO2 evitado por año
  const co2EvitadoAnual = generacionAnual * factorEmisionCO2; // kg CO2/año
  
  // CO2 evitado en 25 años (considerando degradación)
  let co2Evitado25Anos = 0;
  const degradacionAnual = 0.005; // 0.5%
  
  for (let año = 1; año <= 25; año++) {
    const factorDegradacion = Math.pow(1 - degradacionAnual, año - 1);
    co2Evitado25Anos += co2EvitadoAnual * factorDegradacion;
  }
  
  // Equivalencias
  // Un árbol absorbe aproximadamente 22 kg CO2/año
  const equivalenteArboles = co2EvitadoAnual / 22;
  
  // Un auto emite aproximadamente 4,600 kg CO2/año
  const equivalenteAutos = co2EvitadoAnual / 4600;
  
  return {
    co2EvitadoAnual,
    co2Evitado25Anos,
    equivalenteArboles,
    equivalenteAutos,
  };
}

