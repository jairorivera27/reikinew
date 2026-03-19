import type { MiddlewareHandler } from 'astro';
import { securityHeaders } from './lib/security/headers';

/**
 * Middleware de seguridad para agregar headers de seguridad a todas las respuestas
 * Este middleware se ejecuta automáticamente en todas las rutas
 */
export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();
  
  // Agregar headers de seguridad
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
};

