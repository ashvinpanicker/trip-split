'use client';

import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { flushOutbox, OUTBOX_EVENT, readOutbox, type OutboxOp } from '@/lib/outbox';
import { useToast } from '@/components/ui/Toast';
import { warmTrips } from '@/lib/data/warm';
import { formatCurrency } from '@/lib/utils/balance';

/** Changes waiting to sync (optionally for one trip); updates live. */
export function useOutbox(groupId?: string) {
  const [ops, setOps] = useState<OutboxOp[]>([]);
  useEffect(() => {
    const update = () => setOps(readOutbox());
    update();
    window.addEventListener(OUTBOX_EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(OUTBOX_EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  return groupId ? ops.filter((o) => o.groupId === groupId) : ops;
}

const STALE_MS = 60_000;

/**
 * Keeps the phone in step with the server: sends offline changes when signal returns,
 * and refreshes data when you come back to the app after a minute or more away.
 */
export function SyncManager() {
  const { toast } = useToast();
  useEffect(() => {
    let last = Date.now();
    const sync = async (refresh: boolean) => {
      const { sent, failed } = await flushOutbox(createClient());
      if (sent) toast(`Synced ${sent} change${sent === 1 ? '' : 's'} made offline`);
      failed.forEach((f) => toast(`Couldn’t sync ${f}`, 'error'));
      if (refresh || sent) {
        last = Date.now();
        window.dispatchEvent(new Event('tripsplit:refresh'));
        window.dispatchEvent(new Event('tripsplit:expenses-changed'));
      }
    };
    // Keep every trip saved for no signal (at most every 10 min; forced when signal comes back)
    const warm = (force = false) => { warmTrips(force).catch(() => {}); };
    const onVisible = () => { if (document.visibilityState === 'visible') { sync(Date.now() - last > STALE_MS); warm(); } };
    const onOnline = () => { sync(true).then(() => warm(true)); };
    sync(false).then(() => warm());
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisible); };
  }, [toast]);
  return null;
}

/** On a trip page: what's saved on this phone but not sent yet. */
export function PendingChanges({ groupId }: { groupId: string }) {
  const ops = useOutbox(groupId);
  if (!ops.length) return null;
  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <CloudOff size={15} /> Waiting to sync ({ops.length})
      </p>
      <ul className="mt-1.5 space-y-1">
        {ops.map((o) => (
          <li key={o.id} className="flex justify-between gap-3 text-xs text-amber-900">
            <span className="truncate">{o.kind === 'expense' ? o.label : `💸 ${o.label}`}</span>
            <span className="tabular-nums">{formatCurrency(o.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
