'use client';

import { formatCurrency } from '@/lib/utils/balance';
import { recapText, tripDates } from '@/lib/utils/recap';
import type { TripStats } from '@/lib/utils/stats';
import type { Settlement } from '@/types';

/** The front page of a wrapped-up trip: the story in numbers, then where to go next. */
export default function TripRecap({ name, people, stats, open, currency, isAdmin, onSeeBalances, onSeeExpenses, onReopen }: {
  name: string; people: number; stats: TripStats; open: Settlement[]; currency?: string; isAdmin: boolean;
  onSeeBalances: () => void; onSeeExpenses: () => void; onReopen: () => void;
}) {
  const money = (n: number) => formatCurrency(n, currency);
  const top = stats.byCategory[0]?.total || 1;
  const share = () => {
    const link = `${window.location.origin}${window.location.pathname}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(recapText({ name, people, stats, open, link, currency }))}`, '_blank', 'noopener');
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-amber-300 via-orange-400 to-rose-500 p-5 text-white shadow-sm">
        <p className="text-4xl" aria-hidden>🌅</p>
        <h2 className="mt-2 text-2xl font-bold leading-tight">{name} is a wrap</h2>
        <p className="mt-1 text-sm text-white/90">
          {[tripDates(stats.firstDay, stats.lastDay), stats.days > 1 ? `${stats.days} days` : '', `${people} people`].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[[money(stats.total), 'spent'], [money(stats.perHead), 'each, about'], [String(stats.count), stats.count === 1 ? 'bill' : 'bills']].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-white/20 px-2 py-2.5 backdrop-blur-sm">
              <p className="text-base font-bold tabular-nums leading-tight">{v}</p>
              <p className="text-[11px] text-white/90">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={open.length ? onSeeBalances : undefined}
        className={`w-full rounded-2xl px-4 py-3 text-left ${open.length ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}
      >
        {open.length ? (
          <>
            <p className="text-sm font-semibold text-amber-900">{open.length} {open.length === 1 ? 'payment' : 'payments'} still to settle</p>
            <p className="text-xs text-amber-800">See who pays whom →</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-green-800">✅ Everyone’s settled up</p>
        )}
      </button>

      {stats.byCategory.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">Where the money went</p>
          <div className="space-y-2">
            {stats.byCategory.slice(0, 4).map((c) => (
              <div key={c.key}>
                <div className="flex justify-between text-sm"><span className="text-gray-700">{c.emoji} {c.label}</span><span className="tabular-nums text-gray-900">{money(c.total)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${(c.total / top) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(stats.awards.length > 0 || stats.biggest) && (
        <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-2.5">
          {stats.biggest && (
            <p className="text-sm text-gray-700">🏆 Biggest bill: <span className="font-medium text-gray-900">{stats.biggest.title}</span>, {money(stats.biggest.amount)} by {stats.biggest.payer}</p>
          )}
          {stats.awards.slice(0, 4).map((a) => (
            <p key={a.title} className="text-sm text-gray-700">{a.emoji} <span className="font-medium text-gray-900">{a.title}</span>: {a.who}</p>
          ))}
        </div>
      )}

      <button onClick={share} className="w-full h-12 rounded-2xl bg-[#25D366] text-white font-semibold">Share the recap on WhatsApp</button>
      <div className="flex gap-2">
        <button onClick={onSeeExpenses} className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700">See every bill</button>
        {isAdmin && <button onClick={onReopen} className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700">Reopen trip</button>}
      </div>
    </div>
  );
}
