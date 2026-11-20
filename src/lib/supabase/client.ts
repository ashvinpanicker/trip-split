import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Client = ReturnType<typeof createClient>;

/**
 * The signed-in user. Online this is verified with Supabase; offline (no signal on the beach)
 * it falls back to the session saved on this device so cached trips still show.
 * Data access is still enforced by row-level security on the server.
 */
export async function getAuthUser(supabase: Client) {
  const { data, error } = await supabase.auth.getUser();
  if (data.user) return data.user;
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (offline || error?.name === 'AuthRetryableFetchError') {
    const { data: s } = await supabase.auth.getSession();
    return s.session?.user ?? null;
  }
  return null;
}
