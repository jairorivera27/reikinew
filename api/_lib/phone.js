/**
 * Formato display Colombia: "+57 324 573 7413" (espejo liviano para store/PDF).
 */
export function formatPhoneCO(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;

  let national = digits;
  if (national.startsWith('57') && national.length >= 12) {
    national = national.slice(2);
  }
  if (national.length === 10 && /^3\d{9}$/.test(national)) {
    return `+57 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  if (digits.startsWith('57') && digits.length === 12) {
    const m = digits.slice(2);
    return `+57 ${m.slice(0, 3)} ${m.slice(3, 6)} ${m.slice(6)}`;
  }
  if (digits.length >= 10) return `+${digits}`;
  return raw;
}
