import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // One canonical host: www.gotripsplit.app → gotripsplit.app
  if (request.headers.get('host') === 'www.gotripsplit.app') {
    const url = request.nextUrl.clone();
    url.protocol = 'https';
    url.host = 'gotripsplit.app';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
