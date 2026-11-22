import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const MARKETING_PATHS = ['/', '/splitwise-alternative', '/how-to-split-trip-expenses', '/sitemap.xml', '/robots.txt', '/llms.txt', '/sw.js', '/offline.html', '/privacy', '/terms'];
// Everything under these is public content (guides, blog)
const MARKETING_PREFIXES = ['/guides', '/blog', '/s'];
const isMarketing = (p: string) =>
  MARKETING_PATHS.includes(p) || MARKETING_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));

export async function updateSession(request: NextRequest) {
  // Public pages skip the Supabase round-trip entirely (fast TTFB for search engines).
  // "/" still checks signed-in visitors so they land on their dashboard.
  const path = request.nextUrl.pathname;
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
  if (isMarketing(path) && (path !== '/' || !hasSession)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const authPaths = ['/login', '/register'];
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));
  // Invite links and the OAuth callback must work while logged out
  const publicPaths = ['/join', '/api/auth'];
  // Marketing pages are public; logged-in visitors to "/" go straight to their dashboard
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p)) || isMarketing(pathname);

  if (user && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (!user && !isAuthPath && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
