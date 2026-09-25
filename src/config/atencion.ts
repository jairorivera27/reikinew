/**
 * Atención personalizada (ingeniero, comprobantes, posventa).
 * Distinto del número del bot/tienda (300 405 2638).
 */
const fromEnv = String(process.env.ATTENTION_WHATSAPP || process.env.PUBLIC_ATTENTION_WHATSAPP || '')
  .replace(/\D/g, '')
  .trim();

export const ATTENTION_PHONE_E164 = fromEnv || '573245737413';
export const ATTENTION_PHONE_DISPLAY = '+57 324 573 7413';
export const ATTENTION_PHONE_TEL = `+${ATTENTION_PHONE_E164}`;
export const ATTENTION_WHATSAPP_URL = `https://wa.me/${ATTENTION_PHONE_E164}`;

/** URL con texto prellenado para el cliente. */
export function attentionWhatsAppUrl(prefillText = '') {
  const base = ATTENTION_WHATSAPP_URL;
  const t = String(prefillText || '').trim();
  if (!t) return base;
  return `${base}?text=${encodeURIComponent(t)}`;
}
