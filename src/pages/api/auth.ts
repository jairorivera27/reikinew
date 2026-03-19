import type { APIRoute } from 'astro';
import crypto from 'crypto';

// Hash de la contraseña (en producción, usar bcrypt o similar)
// Hash SHA-256 de "Reiki99193*" con salt
const PASSWORD_HASH = process.env.COTIZADOR_PASSWORD_HASH || 
  'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6'; // Placeholder

const USERNAME = process.env.COTIZADOR_USERNAME || 'Jairo Alexander Rivera';

// Rate limiting simple (en producción usar Redis o similar)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

/**
 * Genera hash SHA-256 de una contraseña
 */
function hashPassword(password: string, salt: string = ''): string {
  return crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
}

/**
 * Verifica intentos de login
 */
function checkRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  
  if (!attempts) {
    return { allowed: true };
  }
  
  // Si pasó el tiempo de bloqueo, resetear
  if (now - attempts.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  
  // Si excedió los intentos, bloquear
  if (attempts.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((LOCKOUT_TIME - (now - attempts.lastAttempt)) / 1000);
    return { allowed: false, remainingTime };
  }
  
  return { allowed: true };
}

/**
 * Registra un intento de login
 */
function recordLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(ip, attempts);
}

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Esta ruta solo acepta solicitudes POST.',
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST',
      },
    }
  );
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Obtener IP del cliente
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Verificar rate limiting
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Demasiados intentos fallidos. Intente nuevamente en ' + 
                 Math.ceil(rateLimit.remainingTime! / 60) + ' minutos.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.remainingTime),
          },
        }
      );
    }
    
    // Parsear body
    const body = await request.json();
    const { username, password } = body;
    
    // Validar inputs
    if (!username || !password) {
      recordLoginAttempt(ip, false);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuario y contraseña son requeridos',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Validar longitud
    if (username.length > 100 || password.length > 200) {
      recordLoginAttempt(ip, false);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Datos inválidos',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Verificar credenciales
    // En producción, comparar con hash almacenado
    const isValid = username.trim() === USERNAME && 
                    password === (process.env.COTIZADOR_PASSWORD || 'Reiki99193*');
    
    if (!isValid) {
      recordLoginAttempt(ip, false);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuario o contraseña incorrectos',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Login exitoso
    recordLoginAttempt(ip, true);
    
    // Generar token de sesión (en producción usar JWT)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (8 * 60 * 60 * 1000); // 8 horas
    
    return new Response(
      JSON.stringify({
        success: true,
        token: sessionToken,
        expiresAt,
        username: USERNAME,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Headers de seguridad
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        },
      }
    );
    
  } catch (error: any) {
    console.error('Error en autenticación:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

