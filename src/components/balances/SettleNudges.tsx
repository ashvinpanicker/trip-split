'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/balance';

const SNOOZE_DAYS = 3;
const QUIET_DAYS = 2; // no new expenses for this long = the trip's probably over, time to settle
const key = (gid: string) => `tripsplit:nudge:${gid}`;
const daysSince = (iso?: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : Infinity);

type Trip = { id: string; name: string; currency: string; net: number; lastExpense?: string };

/**
 * Gentle reminders on Home, once a trip has gone quiet: "you owe" → pay now;
 * "you're owed" → one-tap WhatsApp nudge to the group. "Later" hides it for a few days.
 */
export default function SettleNudges({ trips }: { trips: Trip[] }) {
  const [snoozed, setSnoozed] = useState<Record<string, string>>({});
  useEffect(() => {
    try { setSnoozed(Object.fromEntries(trips.map((t) => [t.id, localStorage.getItem(key(t.id)) ?? '']))); } catch {}
  }, [trips]);
  const later = (gid: string) => {
    const now = new Date().toISOString();
    try { localStorage.setItem(key(gid), now); } catch {}
    setSnoozed((s) => ({ ...s, [gid]: now }));
  };

  const due = trips
    .filter((t) => Math.abs(t.net) >= 1 && daysSince(t.lastExpense) >= QUIET_DAYS && daysSince(snoozed[t.id]) >= SNOOZE_DAYS)
    .sort((a, b) => a.net - b.net) // what you owe first
    .slice(0, 2);
  if (!due.length) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <div className="space-y-2">
      {due.map((t) => {
        const owe = t.net < 0;
        const link = `${origin}/groups/${t.id}?tab=balances`;
        const text = `Quick nudge for ${t.name}: let’s settle up. See what you owe and pay by UPI here: ${link}\nPaid? Tap “I’ve paid” so you’re off the list.`;
        return (
          <div key={t.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
              <BellRing size={15} />
              {owe ? `You owe ${formatCurrency(-t.net, t.currency)} in ${t.name}` : `Friends owe you ${formatCurrency(t.net, t.currency)} in ${t.name}`}
            </p>
            <div className="mt-2 flex gap-2">
              {owe ? (
                <Link href={`/groups/${t.id}?tab=balances`} className="flex-1 h-9 inline-flex items-center justify-center rounded-lg bg-green-600 text-white text-sm font-semibold">
                  Pay now
                </Link>
              ) : (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => later(t.id)}
                  className="flex-1 h-9 inline-flex items-center justify-center rounded-lg bg-[#25D366] text-white text-sm font-semibold"
                >
                  Remind on WhatsApp
                </a>
              )}
              <button onClick={() => later(t.id)} className="h-9 px-4 rounded-lg border border-amber-200 bg-white text-sm text-amber-900">Later</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
