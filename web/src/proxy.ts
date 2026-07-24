import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse, type NextRequest } from 'next/server';

const handler = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/vi' || pathname === '/en') {
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', pathname.slice(1), { path: '/' });
    return response;
  }
  return handler(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
