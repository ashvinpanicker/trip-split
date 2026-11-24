import { readSavedMe } from '@/hooks/cache';
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Client = ReturnType<typeof createClient>;

/**
 * The signed-in user, from the session saved on this device (no network round-trip, so pages
 * don't wait on Supabase before loading data; an expired token is refreshed automatically).
 * Security doesn't depend on this: every query is checked by row-level security on the server,
 * and full page loads verify the session in middleware.
 */
/**
 * The signed-in user. Offline with an expired token the session can't refresh,
 * so fall back to who was signed in on this phone (writes are queued and sent once back online).
 */
export async function getAuthUser(supabase: Client): Promise<{ id: string } | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user;
  return typeof navigator !== 'undefined' && !navigator.onLine ? readSavedMe<{ id: string }>() : null;
}
