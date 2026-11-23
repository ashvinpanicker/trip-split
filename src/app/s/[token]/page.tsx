'use client';

import { use, useEffect, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { useT, setLang } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { calculateGroupBalances, directDebts, settleModeOf, settlePlan, formatCurrency, setActiveCurrency, type BalancePerson } from '@/lib/utils/balance';
import { payActions, readPayMethods } from '@/lib/utils/payMethods';

type LinkData = {
  person_id: string;
  group: { id: string; name: string; currency: string | null; simplify_debts: boolean | null; settle_mode?: string | null };
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
  const t = useT();

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
        <p className="mt-4 font-semibold text-gray-900">{t('link.broken')}</p>
        <p className="mt-1 text-sm text-gray-500">{t('link.brokenHint')}</p>
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
  const plan = settlePlan(settleModeOf(data.group), balances, direct);
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
        <p className="text-sm text-gray-500">{t('link.hi', { name: me ? first(me.name) : '' })}</p>
        {Math.abs(net) < 0.01 ? (
          <p className="mt-1 text-2xl font-bold text-gray-900">{t('link.settled')}</p>
        ) : net < 0 ? (
          <p className="mt-1 text-2xl font-bold text-red-600">{t('link.owe', { amount: formatCurrency(-net) })}</p>
        ) : (
          <p className="mt-1 text-2xl font-bold text-green-600">{t('link.get', { amount: formatCurrency(net) })}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">{t('link.share', { n: expenses.length, amount: formatCurrency(myShare) })}</p>
      </section>

      {mine.map((s, i) => {
        const paying = s.from_id === data.person_id;
        const other = paying ? s.to_name : s.from_name;
        const methods = paying ? readPayMethods(data.members.find((m) => m.id === s.to_id)?.pay_methods, data.members.find((m) => m.id === s.to_id)?.upi_id ?? null) : [];
        const actions = payActions(methods, s.amount, currency, data.group.name, s.to_name);
        return (
          <section key={i} className="rounded-2xl bg-white border border-gray-100 p-4">
            <p className="text-gray-900">
              {paying ? t('link.pay', { name: first(other), amount: formatCurrency(s.amount) }) : t('link.paysYou', { name: first(other), amount: formatCurrency(s.amount) })}
            </p>
            {paying && actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {actions.map((a, k) => a.href ? (
                  <a key={a.type + a.value} href={a.href} target={a.href.startsWith('https:') ? '_blank' : undefined} rel="noopener noreferrer"
                    className={`flex-1 min-w-[7.5rem] flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-semibold ${k === 0 ? 'bg-blue-600 text-white' : 'bg-white border border-blue-200 text-blue-700'}`}>
                    {t('settle.payVia', { method: a.label })} {a.href.startsWith('https:') && <ExternalLink size={12} />}
                  </a>
                ) : (
                  <button key={a.type + a.value} onClick={() => copy(a.value)}
                    className="flex-1 min-w-[7.5rem] flex items-center justify-center gap-1.5 h-11 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium">
                    <Copy size={13} /> {copied === a.value ? '✓' : t('settle.address', { method: a.label })}
                  </button>
                ))}
              </div>
            )}
            {paying && actions.find((a) => a.type === 'upi') && (
              <button onClick={() => copy(actions.find((a) => a.type === 'upi')!.value)} className="mt-2 w-full text-left text-xs text-gray-600">
                UPI ID: <span className="font-medium text-gray-900">{actions.find((a) => a.type === 'upi')!.value}</span> ·{' '}
                <span className="text-blue-600 font-medium">{copied === actions.find((a) => a.type === 'upi')!.value ? '✓' : 'Copy'}</span>
              </button>
            )}
            {paying && actions.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">{t('link.noMethod', { name: first(other) })}</p>
            )}
          </section>
        );
      })}

      {mine.some((s) => s.from_id === data.person_id) && (
        <p className="text-xs text-gray-500 text-center">{t('link.after')}</p>
      )}

      <p className="text-center text-sm">
        <a href={`/s/${token}/statement`} className="font-medium text-blue-600">Check the maths (PDF)</a>
      </p>
      <p className="text-center text-xs pt-2">
        <button onClick={() => setLang(t.lang === 'hi' ? 'en' : 'hi')} className="text-blue-600 underline">
          {t.lang === 'hi' ? 'English' : 'हिन्दी में देखें'}
        </button>
      </p>
      <p className="text-center text-xs text-gray-400 pt-4">
        {t('link.join')} <a href="/register" className="underline">{t('link.signup')}</a>
      </p>
    </main>
  );
}
