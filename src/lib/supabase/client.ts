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
export async function getAuthUser(supabase: Client) {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
