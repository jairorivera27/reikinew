/**
 * Teléfono / WhatsApp / correo de atención al cliente (única fuente de verdad en el sitio).
 */
export const CONTACT_PHONE_E164 = '573004052638';

/** Formato legible en UI */
export const CONTACT_PHONE_DISPLAY = '+57 300 405 2638';

/** Enlaces tel: y JSON-LD */
export const CONTACT_PHONE_TEL = '+573004052638';
export const CONTACT_PHONE_SCHEMA = '+57-300-405-2638';

export const CONTACT_WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_E164}`;

/** Correo público de contacto (web, schema, llms.txt) */
export const CONTACT_EMAIL = 'info@reikisolar.com.co';
export const CONTACT_EMAIL_MAILTO = `mailto:${CONTACT_EMAIL}`;
