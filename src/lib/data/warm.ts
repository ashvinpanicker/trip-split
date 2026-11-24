import { createClient } from '@/lib/supabase/client';
import { readCached, writeCached } from '@/hooks/cache';
import { fetchExpenses, fetchGroup, fetchPayments } from './trip';
import type { Group } from '@/types';

const SYNCED_KEY = 'tripsplit:synced-at';
const EVERY_MS = 10 * 60_000;

/** When this phone last saved every trip for offline use (ms), or 0. */
export const lastSynced = () => { try { return Number(localStorage.getItem(SYNCED_KEY)) || 0; } catch { return 0; } };

/**
 * Keep every active trip ready for no signal: its data (same keys the pages read)
 * and its page (the service worker saves it with its scripts). At most every 10 minutes unless forced.
 */
export async function warmTrips(force = false) {
  if (!navigator.onLine || (!force && Date.now() - lastSynced() < EVERY_MS)) return;
  const groups = (readCached<Group[]>('groups') ?? []).filter((g) => !g.archived_at);
  if (!groups.length) return; // trips list not loaded yet: try again later
  const supabase = createClient();
  for (const g of groups) {
    const [group, expenses, payments] = await Promise.all([
      fetchGroup(supabase, g.id), fetchExpenses(supabase, g.id), fetchPayments(supabase, g.id),
    ]);
    if (!group || !expenses || !payments) return; // lost signal midway: try again next time
    writeCached(`group:${g.id}`, group);
    writeCached(`expenses:${g.id}`, expenses);
    writeCached(`payments:${g.id}`, payments);
  }
  navigator.serviceWorker?.controller?.postMessage({
    type: 'warm',
    urls: ['/dashboard', '/groups', '/balances', '/settings', '/profile', ...groups.map((g) => `/groups/${g.id}`)],
  });
  try { localStorage.setItem(SYNCED_KEY, String(Date.now())); } catch {}
  window.dispatchEvent(new Event('tripsplit:synced'));
}
