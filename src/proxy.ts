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
    // Only block regular teachers from admin pages
    if (role === 'teacher') {
      return NextResponse.redirect(new URL('/teacher', request.url));
    }
    // executive partner, developer and admin can both access /admin
  }

  // Protect /teacher routes
  if (pathname.startsWith('/teacher')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Only block pure admins from teacher pages (executive partners and developers are employees too)
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    // executive partner and developer can access /teacher
  }

  // Redirect authenticated users away from the login page
  if (pathname.startsWith('/login')) {
    if (session) {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (role === 'executive partner' || role === 'developer' || role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher', request.url));
      } else {
        // Fallback for any unknown role cookie
        return NextResponse.redirect(new URL('/teacher', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/login'],
};
