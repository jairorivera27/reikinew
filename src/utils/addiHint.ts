/** Color de marca tipo Addi (-checkout acento). */
export const ADDI_BRAND_HEX = '#0066eb';

const DEFAULT_MONTHS = 6;
/** Simula costo financiado muy aproximado (~12 %) repartido en cuotas mensuales. */
const ESTIMATED_INTEREST_FACTOR = 1.12;

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function parseCopFromPriceString(priceString: string): number {
  const cleaned = String(priceString ?? '').replace(/[^0-9]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Texto corto tipo: "O llévalo en 6 cuotas de $X con Addi".
 * Si no hay precio válido: mensaje genérico.
 */
export function getAddiInstallmentHint(
  priceString: string,
  options?: { months?: number }
): string {
  const months = options?.months ?? DEFAULT_MONTHS;
  const raw = parseCopFromPriceString(priceString);
  if (!raw) {
    return 'Paga a cuotas con Addi.';
  }
  const financedApprox = raw * ESTIMATED_INTEREST_FACTOR;
  const perMonth = Math.ceil(financedApprox / months);
  const fmt = copFormatter.format(perMonth);
  return `O llévalo en ${months} cuotas de ${fmt} con Addi`;
}
