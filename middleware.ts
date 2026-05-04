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
  const sessionRes = await updateSession(request);

  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/login' || pathname === '/signup') {
    if (session) {
      const res = NextResponse.redirect(new URL('/', request.url));
      if (sessionRes) {
          res.cookies.set('session', sessionRes.cookies.get('session')?.value || '', sessionRes.cookies.get('session'));
      }
      return res;
    }
    return sessionRes || NextResponse.next();
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
    const res = NextResponse.redirect(new URL('/login', request.url));
    // Usually session won't exist here, but if it was just about to expire and we tried to refresh it,
    // though getSession returning null means it's likely already gone or invalid.
    return res;
  }

  return sessionRes || NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
