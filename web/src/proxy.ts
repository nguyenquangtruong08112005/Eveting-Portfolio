import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/vi' || pathname === '/en') {
    const locale = pathname.slice(1);
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('NEXT_LOCALE', locale, { path: '/' });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
