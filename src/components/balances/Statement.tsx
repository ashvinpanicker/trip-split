'use client';

import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Moon, Sun } from 'lucide-react';
import { elementToPdf } from '@/lib/utils/pdf';
import { formatCurrency } from '@/lib/utils/balance';
import { statementRows } from '@/lib/utils/statement';
import { tripStats } from '@/lib/utils/stats';
import { payActions, type PayMethod } from '@/lib/utils/payMethods';
import TripStatsPanel from '@/components/stats/TripStatsPanel';
import SupportLinks from '@/components/SupportLinks';
import type { Settlement } from '@/types';

type Person = { id: string; name: string };
type Exp = {
  id: string; title: string; date: string; amount: number;
  paid_by: string | null; paid_by_pending?: string | null;
  category?: string | null; created_by?: string | null;
  fx?: { currency: string; amount: number; rate: number } | null;
  participants: { user_id: string | null; pending_member_id: string | null; share_amount: number }[];
};
type Pay = { from_person: string; to_person: string; amount: number; date?: string | null };

/**
 * A settle-up statement anyone can check by hand: per-person totals with the formula,
 * every expense and how it was split, payments made, and the payments still to make.
 * "Save as PDF" uses the browser's print dialog (works on phones too).
 */
export default function Statement({ tripName, currency, persons, expenses, payments, plan, payMethods = {}, me = '' }: {
  tripName: string; currency: string; persons: Person[]; expenses: Exp[]; payments: Pay[]; plan: Settlement[];
  /** person id → ways to pay them (UPI etc.), for tap-to-pay links */
  payMethods?: Record<string, PayMethod[]>;
  me?: string;
}) {
  // Whole amounts without .00 so the table fits on a phone
  const money = (n: number) => formatCurrency(n, currency).replace(/[.,]00(?!\d)/, '');
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  // Light or dark, for the page and the PDF. Starts from the phone's setting.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('tripsplit:statement-theme'); } catch {}
    setTheme(saved === 'dark' || saved === 'light' ? saved : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }, []);
  function pickTheme(t: 'light' | 'dark') {
    setTheme(t);
    try { localStorage.setItem('tripsplit:statement-theme', t); } catch {}
  }
  async function savePdf() {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      await elementToPdf(ref.current, `${tripName.replace(/[^\w -]/g, '').trim() || 'Trip'} - TripSplit.pdf`, theme === 'dark' ? '#121a27' : '#ffffff');
    } catch {
      alert('Couldn\u2019t make the PDF on this device. Try again, or take screenshots.');
    } finally {
      setBusy(false);
    }
  }
  const name = (id: string | null | undefined) => persons.find((p) => p.id === id)?.name ?? '—';
  const { rows, totals, checks } = statementRows(expenses, persons, payments);
  const stats = tripStats(expenses.map((e) => ({ ...e, category: e.category ?? null, created_by: e.created_by ?? null })) as any, persons);
  const site = typeof location !== 'undefined' ? location.origin : 'https://gotripsplit.app';
  const th = 'text-left font-semibold text-gray-600 py-1.5 pr-2 text-xs sm:text-sm';
  const td = 'py-1.5 pr-2 align-top text-xs sm:text-sm';
  const num = 'text-right tabular-nums whitespace-nowrap';

  return (
    <div ref={ref} className={`statement theme-${theme} max-w-3xl mx-auto px-4 py-6 text-sm text-gray-900 bg-white min-h-screen`}>
      <style>{`@media print {
        @page { margin: 12mm; }
        nav, .no-print { display: none !important; }
        body, .statement { background: #fff !important; color: #000 !important; }
        main { padding: 0 !important; }
        .statement .rounded-2xl, .statement tr, .statement li { break-inside: avoid; }
      }`}</style>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500">TripSplit · settle-up statement</p>
          <h1 className="text-xl font-bold">{tripName}</h1>
          <p className="text-xs text-gray-500">
            {expenses.length} expenses · {money(totals.paid)} in total · made {format(new Date(), 'd MMM yyyy, h:mm a')}
          </p>
        </div>
        <div className="no-print shrink-0 flex flex-col items-end gap-2">
          <button onClick={savePdf} disabled={busy} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {busy ? 'Making PDF…' : 'Save as PDF'}
          </button>
          <div role="radiogroup" aria-label="Statement theme" className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t} role="radio" aria-checked={theme === t} onClick={() => pickTheme(t)}
                className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md ${theme === t ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500'}`}
              >
                {t === 'light' ? <Sun size={13} /> : <Moon size={13} />} {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {stats.count > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">The trip in numbers 🎉</h2>
          <TripStatsPanel stats={stats} me={me} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold">1. Everyone&apos;s balance</h2>
        <p className="text-xs text-gray-500 mt-0.5">Balance = paid for the group − your share + payments you sent − payments you received. Plus means you get money back.</p>
        <div className="overflow-x-auto">
          <table className="w-full mt-2 border-t border-gray-200">
            <thead><tr className="border-b border-gray-200">
              <th className={th}>Person</th><th className={`${th} ${num}`}>Paid</th><th className={`${th} ${num}`}>Share</th>
              <th className={`${th} ${num}`}>Sent</th><th className={`${th} ${num}`}>Received</th><th className={`${th} ${num}`}>Balance</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className={td}>{r.name}</td><td className={`${td} ${num}`}>{money(r.paid)}</td><td className={`${td} ${num}`}>{money(r.share)}</td>
                  <td className={`${td} ${num}`}>{money(r.sent)}</td><td className={`${td} ${num}`}>{money(r.received)}</td>
                  <td className={`${td} ${num} font-semibold ${r.net > 0.004 ? 'text-green-700' : r.net < -0.004 ? 'text-red-600' : ''}`}>{r.net > 0.004 ? '+' : ''}{money(r.net)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className={td}>Total</td><td className={`${td} ${num}`}>{money(totals.paid)}</td><td className={`${td} ${num}`}>{money(totals.share)}</td>
                <td className={`${td} ${num}`}>{money(totals.sent)}</td><td className={`${td} ${num}`}>{money(totals.received)}</td><td className={`${td} ${num}`}>{money(totals.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          {checks.paidEqualsShares ? '✓' : '✗'} Total paid equals total shares · {checks.netIsZero ? '✓' : '✗'} Balances add up to zero
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">2. Payments to settle up</h2>
        {plan.length === 0 ? <p className="mt-1 text-gray-600">Nothing to pay. Everyone is settled.</p> : (<>
          <ul className="mt-1 space-y-2">
            {plan.map((s, i) => {
              const ways = payActions(payMethods[s.to_id] ?? [], s.amount, currency, `${tripName} settle-up`, s.to_name);
              const upi = (payMethods[s.to_id] ?? []).find((m) => m.type === 'upi')?.value;
              return (
                <li key={i}>
                  {s.from_name} pays {s.to_name} <strong className="tabular-nums">{money(s.amount)}</strong>
                  {(ways.some((w) => w.href) || upi) && (
                    <span className="block text-xs text-gray-600">
                      {ways.filter((w) => w.href).map((w) => (
                        <a key={w.type + w.value} href={w.href!} className="mr-3 font-medium text-blue-600 underline">Pay via {w.label}</a>
                      ))}
                      {upi && <>UPI ID: <span className="font-medium text-gray-900">{upi}</span></>}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-gray-500">Pay links open your UPI app with the amount filled in (on a phone).</p>
        </>)}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">3. Every expense</h2>
        <div className="overflow-x-auto">
          <table className="w-full mt-2 border-t border-gray-200">
            <thead><tr className="border-b border-gray-200">
              <th className={th}>Date</th><th className={th}>What</th><th className={th}>Paid by</th><th className={`${th} ${num}`}>Amount</th><th className={th}>Split</th>
            </tr></thead>
            <tbody>
              {[...expenses].sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
                <tr key={e.id} className="border-b border-gray-100">
                  <td className={`${td} whitespace-nowrap`}>{format(new Date(e.date), 'd MMM')}</td>
                  <td className={td}>{e.title}{e.fx && <span className="block text-xs text-gray-500">{formatCurrency(e.fx.amount, e.fx.currency)} at {e.fx.rate}</span>}</td>
                  <td className={td}>{name(e.paid_by ?? e.paid_by_pending)}</td>
                  <td className={`${td} ${num}`}>{money(e.amount)}</td>
                  <td className={`${td} text-xs text-gray-600`}>
                    {e.participants.map((p) => `${name(p.user_id ?? p.pending_member_id)} ${money(p.share_amount)}`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {payments.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">4. Payments already made</h2>
          <ul className="mt-1 space-y-0.5">
            {payments.map((s, i) => (
              <li key={i}>{s.date ? `${format(new Date(s.date), 'd MMM')}: ` : ''}{name(s.from_person)} paid {name(s.to_person)} <span className="tabular-nums">{money(s.amount)}</span></li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-gray-200 p-4">
        <h2 className="font-semibold">Enjoyed splitting with TripSplit?</h2>
        <p className="mt-1 text-gray-600">It&apos;s free, with no ads and no daily limits, built by one person.</p>
        <ul className="mt-2 space-y-1">
          <li>✈️ Friends travelling soon? Send them <a href={site} className="font-medium text-blue-600 underline">gotripsplit.app</a></li>
          <li>💬 Tell us what to improve: <a href={`${site}/feedback?from=statement`} className="font-medium text-blue-600 underline">give feedback</a> (takes a minute)</li>
          <li>☕ Like it? <span className="inline-block align-middle"><SupportLinks /></span></li>
        </ul>
      </section>

      <p className="mt-6 text-xs text-gray-400">Made with TripSplit · gotripsplit.app</p>
    </div>
  );
}
