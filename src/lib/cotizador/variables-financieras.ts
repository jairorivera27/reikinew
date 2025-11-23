// Variables financieras para cálculos PPA y EPC
// Basado en la hoja "Var. Financieras" del Excel

export interface VariablesFinancieras {
  ipc: number; // Inflación (IPC) - %
  aumentoPrecioEnergia: number; // Aumento anual del precio de energía - %
  ipp: number; // Índice de Precios al Productor - %
  wacc: number; // Weighted Average Cost of Capital - %
  tasaDescuento: number; // Tasa de descuento para VAN - %
  vidaUtil: number; // Vida útil del sistema en años
  opexPorcentaje: number; // OPEX como % del CAPEX anual
  degradacionAnual: number; // Degradación anual de paneles - %
}

export const VARIABLES_FINANCIERAS_DEFAULT: VariablesFinancieras = {
  ipc: 0.037, // 3.7% (basado en Excel)
  aumentoPrecioEnergia: 0.07, // 7% (basado en Excel)
  ipp: 0.037, // 3.7% (basado en Excel)
  wacc: 0.12, // 12% (basado en Excel)
  tasaDescuento: 0.10, // 10% (para VAN)
  vidaUtil: 25, // 25 años
  opexPorcentaje: 0.015, // 1.5% del CAPEX anual
  degradacionAnual: 0.0055, // 0.55% anual (basado en Excel)
};

/**
 * Obtiene las variables financieras (permite override)
 */
export function obtenerVariablesFinancieras(
  override?: Partial<VariablesFinancieras>
): VariablesFinancieras {
  return {
    ...VARIABLES_FINANCIERAS_DEFAULT,
    ...override,
  };
}

/**
 * Calcula el Capital Recovery Factor (CRF)
 * CRF = (WACC * (1 + WACC)^VidaUtil) / (((1 + WACC)^VidaUtil) - 1)
 */
export function calcularCRF(
  wacc: number = VARIABLES_FINANCIERAS_DEFAULT.wacc,
  vidaUtil: number = VARIABLES_FINANCIERAS_DEFAULT.vidaUtil
): number {
  if (wacc === 0) {
    return 1 / vidaUtil; // Si WACC es 0, retornar 1/n
  }
  
  const numerador = wacc * Math.pow(1 + wacc, vidaUtil);
  const denominador = Math.pow(1 + wacc, vidaUtil) - 1;
  
  return numerador / denominador;
}

