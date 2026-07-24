import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/vi' || pathname === '/en') {
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', pathname.slice(1), { path: '/' });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
