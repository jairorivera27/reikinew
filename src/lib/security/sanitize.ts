/**
 * Funciones de sanitización y validación de seguridad
 * NOTA: Estas funciones son para uso en el servidor.
 * Para funciones del cliente, ver COTSOLRK.astro
 */

/**
 * Sanitiza texto para prevenir XSS (versión servidor - sin DOM)
 */
export function sanitizeHTML(text: string): string {
  if (!text) return '';
  
  // Versión servidor: solo escapar caracteres peligrosos
  return escapeHTML(text);
}

/**
 * Sanitiza y escapa HTML para uso en innerHTML
 */
export function escapeHTML(text: string): string {
  if (!text) return '';
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Valida y sanitiza email
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida y sanitiza teléfono
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  const phoneRegex = /^[0-9]{7,15}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

/**
 * Valida y sanitiza NIT/Cédula
 */
export function validateNIT(nit: string): boolean {
  if (!nit) return true; // Opcional
  const nitRegex = /^[0-9]{6,15}$/;
  return nitRegex.test(nit.replace(/[-\s]/g, ''));
}

/**
 * Valida número positivo
 */
export function validatePositiveNumber(value: string | number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0 && isFinite(num);
}

/**
 * Valida porcentaje (0-100)
 */
export function validatePercentage(value: string | number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0 && num <= 100 && isFinite(num);
}

/**
 * Sanitiza string para prevenir inyección
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (!input) return '';
  
  // Remover caracteres peligrosos
  let sanitized = input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .substring(0, maxLength);
  
  return sanitized;
}

/**
 * Valida que un string no contenga scripts
 */
export function containsScript(input: string): boolean {
  if (!input) return false;
  
  const scriptPatterns = [
    /<script/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];
  
  return scriptPatterns.some(pattern => pattern.test(input));
}

/**
 * Genera un token CSRF simple (versión servidor)
 * NOTA: Requiere importar crypto de Node.js
 */
export function generateCSRFToken(cryptoModule: typeof import('crypto')): string {
  return cryptoModule.randomBytes(32).toString('hex');
}

/**
 * Valida formato de nombre
 */
export function validateName(name: string): boolean {
  if (!name || name.trim().length < 2) return false;
  if (name.length > 100) return false;
  // Permitir letras, espacios, acentos y algunos caracteres especiales
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\.\-']{2,100}$/;
  return nameRegex.test(name.trim());
}

