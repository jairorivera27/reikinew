import type { APIRoute } from 'astro';

type EstadoEnvioRow = {
  estadoEnvio: string;
  fechaEstimada: string | Date | null;
  transportadora: string | null;
};

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const RATE_LIMIT_MAX_REQUESTS = 40;

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const candidate = (forwarded?.split(',')[0] || realIp || 'unknown').trim();
  return candidate || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - current.windowStart);
    return { allowed: false, retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  current.count += 1;
  rateLimitStore.set(ip, current);
  return { allowed: true };
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

function normalizeNumeroOrden(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  // Permitimos solo caracteres comunes de referencia para evitar payloads maliciosos.
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(value)) return null;
  return value;
}

async function getPrismaClient() {
  const globalKey = '__reikiPrismaClient';
  const g = globalThis as Record<string, any>;
  if (g[globalKey]) return g[globalKey];

  const prismaModule = await import('@prisma/client');
  const prisma = new prismaModule.PrismaClient();
  g[globalKey] = prisma;
  return prisma;
}

async function findEstadoEnvioByNumeroOrden(numeroOrden: string): Promise<EstadoEnvioRow | null> {
  const prisma = await getPrismaClient();

  const rows = await prisma.$queryRaw<EstadoEnvioRow[]>`
    SELECT
      estado_envio AS estadoEnvio,
      fecha_estimada_entrega AS fechaEstimada,
      transportadora AS transportadora
    FROM pedidos
    WHERE numero_orden = ${numeroOrden}
    LIMIT 1
  `;

  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

function formatFechaEstimada(value: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export const GET: APIRoute = async ({ request, url }) => {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        ok: false,
        error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
      },
      429,
      { 'Retry-After': String(rateLimit.retryAfter || 60) }
    );
  }

  const numeroOrden = normalizeNumeroOrden(url.searchParams.get('numeroOrden'));
  if (!numeroOrden) {
    return jsonResponse(
      {
        ok: false,
        error: 'El parámetro numeroOrden es requerido y debe ser válido.',
      },
      400
    );
  }

  try {
    const envio = await findEstadoEnvioByNumeroOrden(numeroOrden);

    if (!envio) {
      return jsonResponse(
        {
          ok: false,
          error: 'Pedido no encontrado.',
        },
        404
      );
    }

    return jsonResponse({
      ok: true,
      data: {
        numeroOrden,
        estadoEnvio: envio.estadoEnvio,
        fechaEstimada: formatFechaEstimada(envio.fechaEstimada),
        transportadora: envio.transportadora || 'Por asignar',
      },
    });
  } catch (error) {
    console.error('[api/estado-envio] Error consultando pedido:', error);
    return jsonResponse(
      {
        ok: false,
        error: 'No fue posible consultar el estado del envío.',
      },
      500
    );
  }
};

