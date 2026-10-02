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
    // Teachers with the "photo-albums" permission are allowed into that one page.
    // The middleware cannot read DB permissions, so we allow all teachers through to
    // /admin/photo-albums — the sidebar only shows the link to permitted users.
    if (role === 'teacher' && pathname.startsWith('/admin/photo-albums')) {
      return NextResponse.next();
    }
    // Only block regular teachers and parents from other admin pages
    if (role === 'teacher' || role === 'parent') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    // executive assistant, developer and admin can both access /admin
  }

  // Protect /teacher routes
  if (pathname.startsWith('/teacher')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Block pure admins and parents from teacher pages
    if (role === 'admin' || role === 'parent') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    // executive assistant and developer can access /teacher
  }

  // Protect /parent routes
  if (pathname.startsWith('/parent/dashboard') || pathname.startsWith('/parent/profile')) {
    if (!session) {
      return NextResponse.redirect(new URL('/parent/login', request.url));
    }
    if (role !== 'parent') {
      // Non-parents who somehow hit /parent/* — redirect to unauthorized
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Redirect authenticated users away from the main login page
  if (pathname.startsWith('/login') || pathname === '/login') {
    if (session) {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (role === 'parent') {
        return NextResponse.redirect(new URL('/parent/dashboard', request.url));
      } else if (role === 'executive assistant' || role === 'developer' || role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher', request.url));
      } else {
        return NextResponse.redirect(new URL('/teacher', request.url));
      }
    }
  }

  // Redirect authenticated parents away from the parent login page
  if (pathname.startsWith('/parent/login')) {
    if (session && role === 'parent') {
      return NextResponse.redirect(new URL('/parent/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/parent/:path*', '/login'],
};

