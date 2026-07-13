import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session');
  const role = request.cookies.get('role')?.value;

  const pathname = request.nextUrl.pathname;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Block teachers from accessing admin pages
    if (role === 'teacher') {
      return NextResponse.redirect(new URL('/teacher', request.url));
    }
  }

  // Protect /teacher routes
  if (pathname.startsWith('/teacher')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Block admins from accessing teacher pages
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Redirect authenticated users away from the login page
  if (pathname.startsWith('/login')) {
    if (session) {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher', request.url));
      } else {
        // Fallback
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/login'],
};
