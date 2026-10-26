const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Fecha AAAA-MM-DD a texto en español, sin depender de la zona horaria. */
export function fechaIngreso(iso?: string | null): string | null {
  if (!iso) return null;
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const mes = MESES[Number(match[2]) - 1];
  const dia = Number(match[3]);
  if (!mes || !dia) return null;
  return `${dia} de ${mes} de ${match[1]}`;
}

/** Con fecha de ingreso el aviso es Preorden. Sin fecha se conserva la etiqueta anterior. */
export function etiquetaStockVisible(stock?: string, fecha?: string | null): string {
  if (stock === 'agotado') return 'Agotado';
  if (stock === 'pre-orden') return fecha ? 'Preorden' : 'Agotado · Pre-orden';
  return 'Disponible';
}
