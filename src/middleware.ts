import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'kas_keluarga_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Izinkan route public:
  // - Halaman login
  // - Offline page
  // - API auth (login, setup-pin, logout)
  // - Asset Next.js (_next)
  // - Asset statis PWA (manifest, sw, icons)
  if (
    pathname.startsWith('/login') ||
    pathname === '/offline' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/anggota' ||
    pathname.startsWith('/_next') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons')
  ) {
    return NextResponse.next();
  }

  // Cek keberadaan cookie sesi
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    // Jika tidak ada sesi, handle berdasarkan tipe request
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Redirect ke login untuk halaman web
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
