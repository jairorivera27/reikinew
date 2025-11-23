import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/okr';

  // Si la ruta no comienza con el basePath, redirigir
  if (!pathname.startsWith(basePath) && pathname !== '/') {
    return NextResponse.redirect(new URL(`${basePath}${pathname}`, request.url));
  }

  // Si es la raíz, redirigir al dashboard
  if (pathname === '/' || pathname === basePath) {
    return NextResponse.redirect(new URL(`${basePath}/dashboard`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

