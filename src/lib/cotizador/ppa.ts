// Funciones de cálculo para modelo PPA (Power Purchase Agreement)
// Basado en las hojas "PPA Calculos", "PPA Datos Salida", "PPA Flujo de Caja Cliente"

import type { FlujoCaja } from './tipos';
import { calcularCRF, obtenerVariablesFinancieras, type VariablesFinancieras } from './variables-financieras';

export interface ResultadoPPA {
  potenciaInstaladaDC: number; // kWp
  potenciaInstaladaAC: number; // kW
  generacionAnual: number; // kWh/año
  capex: number; // Costo total del sistema (COP)
  opexAnual: number; // Operación y mantenimiento anual (COP)
  precioPPA: {
    '10': number; // $/kWh para 10 años
    '12': number; // $/kWh para 12 años
    '15': number; // $/kWh para 15 años
  };
  ahorroAnual: {
    '10': number; // COP/año para 10 años
    '12': number; // COP/año para 12 años
    '15': number; // COP/año para 15 años
  };
  cuotaMensual: {
    '10': number; // COP/mes para 10 años
    '12': number; // COP/mes para 12 años
    '15': number; // COP/mes para 15 años
  };
  flujoCajaCliente: FlujoCajaPPA[];
  flujoCajaInversionista?: FlujoCajaInversionista[];
  // Métricas adicionales para inversionistas
  metricasInversionista?: MetricasInversionista;
}

export interface MetricasInversionista {
  tir: number; // TIR del inversionista
  van: number; // VAN del inversionista
  roi: number; // ROI del inversionista
  paybackPeriod: number; // Años de recuperación
  ingresoTotal: number; // Ingreso total durante el contrato
  ingresoPromedioAnual: number; // Ingreso promedio anual
  margenBruto: number; // Margen bruto (%)
  margenNeto: number; // Margen neto (%)
  lcoe: number; // Levelized Cost of Energy ($/kWh)
  comparativaEscenarios: {
    '10': EscenarioPPA;
    '12': EscenarioPPA;
    '15': EscenarioPPA;
  };
}

export interface EscenarioPPA {
  duracion: number;
  precioPPA: number;
  tir: number;
  van: number;
  ingresoTotal: number;
  margenBruto: number;
}

export interface FlujoCajaPPA {
  año: number;
  energiaGenerada: number; // kWh (con degradación)
  tarifaConvencional: number; // $/kWh (con IPC)
  tarifaPPA: number; // $/kWh (fija o con escalamiento)
  ahorroPorKWh: number; // $/kWh
  ahorroAnual: number; // COP/año
  flujoNeto: number; // COP (siempre positivo, sin inversión inicial)
  flujoAcumulado: number; // COP
}

export interface FlujoCajaInversionista {
  año: number;
  inversionInicial: number; // COP (negativo en año 0)
  energiaDesplazada: number; // kWh
  ventaEnergia: number; // COP (energía * precio PPA)
  opex: number; // COP (negativo)
  repotenciacion: number; // COP (negativo, 1% del CAPEX)
  beneficioRenta: number; // COP (positivo, deducción 50%)
  flujoNeto: number; // COP
  flujoAcumulado: number; // COP
  tir?: number; // TIR del inversionista
}

export interface ParametrosPPA {
  capex: number; // Costo total del sistema
  generacionAnual: number; // kWh/año
  tarifaElectrica: number; // $/kWh actual
  porcentajeAutoconsumo: number; // 0-1 (ej: 0.6 = 60%)
  duracionContrato?: number; // años (10, 12, 15)
  variablesFinancieras?: Partial<VariablesFinancieras>;
}

/**
 * Calcula el precio PPA por kWh para diferentes duraciones de contrato
 */
export function calcularPrecioPPA(
  capex: number,
  generacionAnual: number,
  variables: VariablesFinancieras
): { '10': number; '12': number; '15': number } {
  const opexAnual = capex * variables.opexPorcentaje;
  
  // Calcular CRF para diferentes duraciones
  const crf10 = calcularCRF(variables.wacc, 10);
  const crf12 = calcularCRF(variables.wacc, 12);
  const crf15 = calcularCRF(variables.wacc, 15);
  
  // Precio PPA = (CAPEX * CRF + OPEX) / Generación Anual
  const precio10 = (capex * crf10 + opexAnual) / generacionAnual;
  const precio12 = (capex * crf12 + opexAnual) / generacionAnual;
  const precio15 = (capex * crf15 + opexAnual) / generacionAnual;
  
  return {
    '10': precio10,
    '12': precio12,
    '15': precio15,
  };
}

/**
 * Calcula el ahorro anual del cliente en modelo PPA
 */
export function calcularAhorroAnualPPA(
  generacionAnual: number,
  tarifaElectrica: number,
  tarifaPPA: number,
  porcentajeAutoconsumo: number,
  tarifaVentaExcedentes?: number
): number {
  const tarifaVenta = tarifaVentaExcedentes || tarifaElectrica * 0.9;
  
  // Ahorro = Generación * (
  //   (Tarifa Actual - Tarifa PPA) * %Autoconsumo +
  //   (Tarifa Actual * 0.9 - Tarifa PPA) * (1 - %Autoconsumo)
  // )
  const ahorroAutoconsumo = generacionAnual * porcentajeAutoconsumo * (tarifaElectrica - tarifaPPA);
  const ahorroExcedentes = generacionAnual * (1 - porcentajeAutoconsumo) * (tarifaVenta - tarifaPPA);
  
  return ahorroAutoconsumo + ahorroExcedentes;
}

/**
 * Calcula el flujo de caja del cliente en modelo PPA
 */
export function calcularFlujoCajaClientePPA(
  parametros: ParametrosPPA
): FlujoCajaPPA[] {
  const variables = obtenerVariablesFinancieras(parametros.variablesFinancieras);
  const duracion = parametros.duracionContrato || 15;
  
  // Calcular precio PPA (usar duración del contrato)
  const preciosPPA = calcularPrecioPPA(
    parametros.capex,
    parametros.generacionAnual,
    variables
  );
  const tarifaPPA = preciosPPA[duracion.toString() as '10' | '12' | '15'] || preciosPPA['15'];
  
  const flujoCaja: FlujoCajaPPA[] = [];
  let energiaGenerada = parametros.generacionAnual;
  let tarifaConvencional = parametros.tarifaElectrica;
  let flujoAcumulado = 0;
  
  // Año 0: Sin inversión inicial (flujo = 0)
  flujoCaja.push({
    año: 0,
    energiaGenerada: 0,
    tarifaConvencional: parametros.tarifaElectrica,
    tarifaPPA: tarifaPPA,
    ahorroPorKWh: 0,
    ahorroAnual: 0,
    flujoNeto: 0,
    flujoAcumulado: 0,
  });
  
  // Años 1 a duración del contrato
  for (let año = 1; año <= duracion; año++) {
    // Aplicar degradación de paneles
    energiaGenerada = energiaGenerada * (1 - variables.degradacionAnual);
    
    // Aplicar IPC a tarifa convencional
    tarifaConvencional = tarifaConvencional * (1 + variables.ipc);
    
    // Calcular ahorro
    const ahorroPorKWh = tarifaConvencional - tarifaPPA;
    const ahorroAnual = calcularAhorroAnualPPA(
      energiaGenerada,
      tarifaConvencional,
      tarifaPPA,
      parametros.porcentajeAutoconsumo
    );
    
    flujoAcumulado += ahorroAnual;
    
    flujoCaja.push({
      año,
      energiaGenerada,
      tarifaConvencional,
      tarifaPPA,
      ahorroPorKWh,
      ahorroAnual,
      flujoNeto: ahorroAnual, // Siempre positivo, sin inversión
      flujoAcumulado,
    });
  }
  
  return flujoCaja;
}

/**
 * Calcula el flujo de caja del inversionista en modelo PPA
 */
export function calcularFlujoCajaInversionistaPPA(
  parametros: ParametrosPPA
): FlujoCajaInversionista[] {
  const variables = obtenerVariablesFinancieras(parametros.variablesFinancieras);
  const duracion = parametros.duracionContrato || 15;
  
  // Calcular precio PPA
  const preciosPPA = calcularPrecioPPA(
    parametros.capex,
    parametros.generacionAnual,
    variables
  );
  const tarifaPPA = preciosPPA[duracion.toString() as '10' | '12' | '15'] || preciosPPA['15'];
  
  const flujoCaja: FlujoCajaInversionista[] = [];
  let energiaDesplazada = parametros.generacionAnual;
  let flujoAcumulado = 0;
  
  // Año 0: Inversión inicial (negativa)
  flujoCaja.push({
    año: 0,
    inversionInicial: -parametros.capex,
    energiaDesplazada: 0,
    ventaEnergia: 0,
    opex: 0,
    repotenciacion: 0,
    beneficioRenta: 0,
    flujoNeto: -parametros.capex,
    flujoAcumulado: -parametros.capex,
  });
  
  flujoAcumulado = -parametros.capex;
  
  // Años 1 a duración del contrato
  for (let año = 1; año <= duracion; año++) {
    // Aplicar degradación
    energiaDesplazada = energiaDesplazada * (1 - variables.degradacionAnual);
    
    // Venta de energía
    const ventaEnergia = energiaDesplazada * tarifaPPA;
    
    // OPEX = 10% de la venta de energía (basado en Excel)
    const opex = -ventaEnergia * 0.1;
    
    // Repotenciación = 1% del CAPEX anual
    const repotenciacion = -parametros.capex * 0.01;
    
    // Beneficio Renta = Deducción del 50% / 10 años (años 2-11)
    let beneficioRenta = 0;
    if (año >= 2 && año <= 11) {
      beneficioRenta = (parametros.capex * 0.5 * 0.35) / 10; // 50% deducción, 35% tasa impuesto
    }
    
    const flujoNeto = ventaEnergia + opex + repotenciacion + beneficioRenta;
    flujoAcumulado += flujoNeto;
    
    flujoCaja.push({
      año,
      inversionInicial: 0,
      energiaDesplazada,
      ventaEnergia,
      opex,
      repotenciacion,
      beneficioRenta,
      flujoNeto,
      flujoAcumulado,
    });
  }
  
  // Calcular TIR del inversionista
  const flujos = flujoCaja.map(f => f.flujoNeto);
  const tir = calcularTIR(flujos);
  
  // Agregar TIR al último elemento
  if (flujoCaja.length > 0) {
    flujoCaja[flujoCaja.length - 1].tir = tir;
  }
  
  return flujoCaja;
}

/**
 * Calcula la TIR usando método de bisección
 */
function calcularTIR(flujos: number[]): number {
  function calcularVAN(tasa: number): number {
    let van = 0;
    for (let i = 0; i < flujos.length; i++) {
      van += flujos[i] / Math.pow(1 + tasa, i);
    }
    return van;
  }
  
  let tasaBaja = -0.99;
  let tasaAlta = 2.0;
  const tolerancia = 0.0001;
  const maxIteraciones = 100;
  
  for (let i = 0; i < maxIteraciones; i++) {
    const tasaMedia = (tasaBaja + tasaAlta) / 2;
    const vanMedia = calcularVAN(tasaMedia);
    
    if (Math.abs(vanMedia) < tolerancia) {
      return tasaMedia;
    }
    
    const vanBaja = calcularVAN(tasaBaja);
    
    if (vanBaja * vanMedia < 0) {
      tasaAlta = tasaMedia;
    } else {
      tasaBaja = tasaMedia;
    }
  }
  
  return (tasaBaja + tasaAlta) / 2;
}

/**
 * Calcula métricas adicionales para inversionistas
 */
function calcularMetricasInversionista(
  flujoCajaInversionista: FlujoCajaInversionista[],
  capex: number,
  generacionAnual: number,
  preciosPPA: { '10': number; '12': number; '15': number },
  variables: VariablesFinancieras
): MetricasInversionista {
  if (!flujoCajaInversionista || flujoCajaInversionista.length === 0) {
    return {
      tir: 0,
      van: 0,
      roi: 0,
      paybackPeriod: 0,
      ingresoTotal: 0,
      ingresoPromedioAnual: 0,
      margenBruto: 0,
      margenNeto: 0,
      lcoe: 0,
      comparativaEscenarios: {
        '10': { duracion: 10, precioPPA: preciosPPA['10'], tir: 0, van: 0, ingresoTotal: 0, margenBruto: 0 },
        '12': { duracion: 12, precioPPA: preciosPPA['12'], tir: 0, van: 0, ingresoTotal: 0, margenBruto: 0 },
        '15': { duracion: 15, precioPPA: preciosPPA['15'], tir: 0, van: 0, ingresoTotal: 0, margenBruto: 0 },
      },
    };
  }
  
  const tir = flujoCajaInversionista[flujoCajaInversionista.length - 1]?.tir || 0;
  const flujos = flujoCajaInversionista.map(f => f.flujoNeto);
  
  // Calcular VAN
  const van = calcularVAN(flujos, variables.wacc);
  
  // Calcular ROI
  const ingresoTotal = flujoCajaInversionista
    .slice(1)
    .reduce((sum, f) => sum + f.ventaEnergia, 0);
  const costoTotal = capex + flujoCajaInversionista
    .slice(1)
    .reduce((sum, f) => sum + Math.abs(f.opex) + Math.abs(f.repotenciacion), 0);
  const roi = ((ingresoTotal - costoTotal) / capex) * 100;
  
  // Calcular Payback Period
  let paybackPeriod = 0;
  let flujoAcumulado = 0;
  for (let i = 1; i < flujoCajaInversionista.length; i++) {
    flujoAcumulado += flujoCajaInversionista[i].flujoNeto;
    if (flujoAcumulado >= capex) {
      paybackPeriod = i;
      break;
    }
  }
  
  // Ingreso promedio anual
  const años = flujoCajaInversionista.length - 1;
  const ingresoPromedioAnual = ingresoTotal / años;
  
  // Margen bruto (%)
  const margenBruto = ((ingresoTotal - (capex + flujoCajaInversionista.slice(1).reduce((sum, f) => sum + Math.abs(f.opex), 0))) / ingresoTotal) * 100;
  
  // Margen neto (%)
  const margenNeto = ((ingresoTotal - costoTotal) / ingresoTotal) * 100;
  
  // LCOE (Levelized Cost of Energy)
  const energiaTotal = generacionAnual * años;
  const lcoe = costoTotal / energiaTotal;
  
  // Comparativa de escenarios
  const comparativaEscenarios = {
    '10': calcularEscenarioPPA(10, preciosPPA['10'], capex, generacionAnual, variables),
    '12': calcularEscenarioPPA(12, preciosPPA['12'], capex, generacionAnual, variables),
    '15': calcularEscenarioPPA(15, preciosPPA['15'], capex, generacionAnual, variables),
  };
  
  return {
    tir,
    van,
    roi,
    paybackPeriod,
    ingresoTotal,
    ingresoPromedioAnual,
    margenBruto,
    margenNeto,
    lcoe,
    comparativaEscenarios,
  };
}

/**
 * Calcula métricas para un escenario PPA específico
 */
function calcularEscenarioPPA(
  duracion: number,
  precioPPA: number,
  capex: number,
  generacionAnual: number,
  variables: VariablesFinancieras
): EscenarioPPA {
  const opexAnual = capex * variables.opexPorcentaje;
  let energiaTotal = 0;
  let ingresoTotal = 0;
  let energiaAcum = generacionAnual;
  
  for (let año = 1; año <= duracion; año++) {
    energiaTotal += energiaAcum;
    ingresoTotal += energiaAcum * precioPPA;
    energiaAcum *= (1 - variables.degradacionAnual);
  }
  
  const costoTotal = capex + (opexAnual * duracion) + (capex * 0.01 * duracion);
  const margenBruto = ((ingresoTotal - costoTotal) / ingresoTotal) * 100;
  
  // Calcular TIR y VAN para este escenario
  const flujos = [-capex];
  for (let año = 1; año <= duracion; año++) {
    const energia = generacionAnual * Math.pow(1 - variables.degradacionAnual, año - 1);
    const venta = energia * precioPPA;
    const opex = -opexAnual * (1 + variables.ipc) ** (año - 1);
    const repot = -capex * 0.01;
    const beneficioRenta = (año >= 2 && año <= 11) ? (capex * 0.5 * 0.35) / 10 : 0;
    flujos.push(venta + opex + repot + beneficioRenta);
  }
  
  const tir = calcularTIR(flujos);
  const van = calcularVAN(flujos, variables.wacc);
  
  return {
    duracion,
    precioPPA,
    tir,
    van,
    ingresoTotal,
    margenBruto,
  };
}

/**
 * Calcula el VAN (Valor Actual Neto)
 */
function calcularVAN(flujos: number[], tasaDescuento: number): number {
  let van = 0;
  for (let i = 0; i < flujos.length; i++) {
    van += flujos[i] / Math.pow(1 + tasaDescuento, i);
  }
  return van;
}

/**
 * Calcula el resultado completo del modelo PPA
 */
export function calcularSistemaPPA(
  parametros: ParametrosPPA
): ResultadoPPA {
  const variables = obtenerVariablesFinancieras(parametros.variablesFinancieras);
  
  // Calcular precios PPA para diferentes duraciones
  const preciosPPA = calcularPrecioPPA(
    parametros.capex,
    parametros.generacionAnual,
    variables
  );
  
  // Calcular ahorros anuales para cada duración
  const ahorroAnual: { '10': number; '12': number; '15': number } = {
    '10': calcularAhorroAnualPPA(
      parametros.generacionAnual,
      parametros.tarifaElectrica,
      preciosPPA['10'],
      parametros.porcentajeAutoconsumo
    ),
    '12': calcularAhorroAnualPPA(
      parametros.generacionAnual,
      parametros.tarifaElectrica,
      preciosPPA['12'],
      parametros.porcentajeAutoconsumo
    ),
    '15': calcularAhorroAnualPPA(
      parametros.generacionAnual,
      parametros.tarifaElectrica,
      preciosPPA['15'],
      parametros.porcentajeAutoconsumo
    ),
  };
  
  // Calcular cuotas mensuales
  const cuotaMensual = {
    '10': (preciosPPA['10'] * parametros.generacionAnual) / 12,
    '12': (preciosPPA['12'] * parametros.generacionAnual) / 12,
    '15': (preciosPPA['15'] * parametros.generacionAnual) / 12,
  };
  
  // Calcular flujo de caja del cliente
  const flujoCajaCliente = calcularFlujoCajaClientePPA(parametros);
  
  // Calcular flujo de caja del inversionista
  const flujoCajaInversionista = calcularFlujoCajaInversionistaPPA(parametros);
  
  const opexAnual = parametros.capex * variables.opexPorcentaje;
  
  // Calcular métricas adicionales para inversionistas
  const metricasInversionista = calcularMetricasInversionista(
    flujoCajaInversionista,
    parametros.capex,
    parametros.generacionAnual,
    preciosPPA,
    variables
  );
  
  return {
    potenciaInstaladaDC: 0, // Se calculará desde los equipos
    potenciaInstaladaAC: 0, // Se calculará desde los equipos
    generacionAnual: parametros.generacionAnual,
    capex: parametros.capex,
    opexAnual,
    precioPPA: preciosPPA,
    ahorroAnual,
    cuotaMensual,
    flujoCajaCliente,
    flujoCajaInversionista,
    metricasInversionista,
  };
}

