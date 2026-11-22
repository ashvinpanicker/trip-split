'use client';

import { use, useEffect, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';
import { calculateGroupBalances, directDebts, smartSettle, formatCurrency, setActiveCurrency, type BalancePerson } from '@/lib/utils/balance';
import { payActions, readPayMethods } from '@/lib/utils/payMethods';

type LinkData = {
  person_id: string;
  group: { id: string; name: string; currency: string | null; simplify_debts: boolean | null };
  members: { id: string; name: string; pay_methods: unknown; upi_id: string | null }[];
  pending: { id: string; name: string }[];
  expenses: { id: string; title: string; amount: number; date: string; paid_by: string | null; paid_by_pending: string | null;
    participants: { user_id: string | null; pending_member_id: string | null; share_amount: number }[] | null }[];
  settlements: { from_person: string; to_person: string; amount: number }[];
};

/** "Your balance" page for a friend, no sign-in: what you owe or are owed, and one-tap pay. */
export default function BalanceLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<LinkData | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) { setState('missing'); return; }
    createClient().rpc('get_balance_link', { p_token: token }).then(({ data, error }) => {
      if (error || !data) setState('missing');
      else { setData(data as LinkData); setState('ok'); }
    });
  }, [token]);

  if (state === 'loading') {
    return <div className="max-w-md mx-auto p-6 space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}</div>;
  }
  if (state === 'missing' || !data) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <LogoMark className="mx-auto h-10 w-10" />
        <p className="mt-4 font-semibold text-gray-900">This link doesn't work any more</p>
        <p className="mt-1 text-sm text-gray-500">Ask whoever sent it for a fresh one.</p>
      </div>
    );
  }

  const currency = data.group.currency || 'INR';
  setActiveCurrency(currency);
  const persons: BalancePerson[] = [
    ...data.members.map((m) => ({ id: m.id, name: m.name })),
    ...data.pending.map((p) => ({ id: p.id, name: p.name, is_pending: true })),
  ];
  const me = persons.find((p) => p.id === data.person_id);
  const expenses = data.expenses.map((e) => ({ ...e, participants: e.participants ?? [] }));
  const balances = calculateGroupBalances(expenses as any, persons, data.settlements as any);
  const direct = directDebts(expenses as any, persons, data.settlements as any);
  // Same plan the app shows: simplified if the trip has that on, else pay each person back directly
  const plan = data.group.simplify_debts ? smartSettle(balances, direct) : direct;
  const mine = plan.filter((s) => s.from_id === data.person_id || s.to_id === data.person_id);
  const net = balances.find((b) => b.person_id === data.person_id)?.net_balance ?? 0;
  const myShare = expenses.reduce((s, e) => s + Number(e.participants.find((p) => (p.user_id ?? p.pending_member_id) === data.person_id)?.share_amount ?? 0), 0);
  const first = (n: string) => n.split(' ')[0];

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(null), 2000); }
    catch { prompt('Copy this address:', value); }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-4">
      <header className="flex items-center gap-2">
        <LogoMark className="h-8 w-8" />
        <div className="min-w-0">
          <p className="text-xs text-gray-500">TripSplit</p>
          <h1 className="font-semibold text-gray-900 truncate">{data.group.name}</h1>
        </div>
      </header>

      <section className="rounded-2xl bg-white border border-gray-100 p-5">
        <p className="text-sm text-gray-500">Hi {me ? first(me.name) : 'there'}</p>
        {Math.abs(net) < 0.01 ? (
          <p className="mt-1 text-2xl font-bold text-gray-900">You're all settled up 🎉</p>
        ) : net < 0 ? (
          <p className="mt-1 text-2xl font-bold text-red-600">You owe {formatCurrency(-net)}</p>
        ) : (
          <p className="mt-1 text-2xl font-bold text-green-600">You get back {formatCurrency(net)}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Your share of {expenses.length} expenses: {formatCurrency(myShare)}</p>
      </section>

      {mine.map((s, i) => {
        const paying = s.from_id === data.person_id;
        const other = paying ? s.to_name : s.from_name;
        const methods = paying ? readPayMethods(data.members.find((m) => m.id === s.to_id)?.pay_methods, data.members.find((m) => m.id === s.to_id)?.upi_id ?? null) : [];
        const actions = payActions(methods, s.amount, currency, data.group.name, s.to_name);
        return (
          <section key={i} className="rounded-2xl bg-white border border-gray-100 p-4">
            <p className="text-gray-900">
              {paying ? <>Pay <strong>{first(other)}</strong></> : <><strong>{first(other)}</strong> pays you</>}{' '}
              <strong className="tabular-nums">{formatCurrency(s.amount)}</strong>
            </p>
            {paying && actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {actions.map((a, k) => a.href ? (
                  <a key={a.type + a.value} href={a.href} target={a.href.startsWith('https:') ? '_blank' : undefined} rel="noopener noreferrer"
                    className={`flex-1 min-w-[7.5rem] flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-semibold ${k === 0 ? 'bg-blue-600 text-white' : 'bg-white border border-blue-200 text-blue-700'}`}>
                    Pay via {a.label} {a.href.startsWith('https:') && <ExternalLink size={12} />}
                  </a>
                ) : (
                  <button key={a.type + a.value} onClick={() => copy(a.value)}
                    className="flex-1 min-w-[7.5rem] flex items-center justify-center gap-1.5 h-11 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium">
                    <Copy size={13} /> {copied === a.value ? 'Copied' : `${a.label} address`}
                  </button>
                ))}
              </div>
            )}
            {paying && actions.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">{first(other)} hasn't added a payment method yet. Pay them however you usually do.</p>
            )}
          </section>
        );
      })}

      {mine.some((s) => s.from_id === data.person_id) && (
        <p className="text-xs text-gray-500 text-center">After you pay, tell the trip admin so they can mark it paid.</p>
      )}

      <p className="text-center text-xs text-gray-400 pt-4">
        Want to add expenses yourself? <a href="/register" className="underline">Make a free account</a>.
      </p>
    </main>
  );
}
