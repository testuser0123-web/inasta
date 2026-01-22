import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/auth';

export async function middleware(request: NextRequest) {
  // Maintenance Mode
  if (process.env.MAINTENANCE_MODE === 'true') {
    if (request.nextUrl.pathname === '/maintenance') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Update session expiry if exists
  await updateSession(request);

  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/login' || pathname === '/signup') {
    if (session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Guest Allowed Routes
  const isGuestAllowed =
      pathname === '/' ||
      pathname.startsWith('/diary') ||
      pathname.startsWith('/contests') ||
      pathname.startsWith('/users/') ||
      pathname.startsWith('/p/') ||
      pathname.startsWith('/search') ||
      pathname.startsWith('/contributors');

  // Protected routes (everything else)
  // Exclude static files, images, etc.
  if (
    !session &&
    !isGuestAllowed &&
    !pathname.startsWith('/_next') &&
    !pathname.includes('.') // naive static file check
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
