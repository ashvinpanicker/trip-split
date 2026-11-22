'use client';

import { use, useEffect, useState } from 'react';
import Statement from '@/components/balances/Statement';
import { createClient } from '@/lib/supabase/client';
import { calculateGroupBalances, directDebts, smartSettle, setActiveCurrency, type BalancePerson } from '@/lib/utils/balance';

/** The same statement, for friends with a balance link (no sign-in). */
export default function LinkStatementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) { setMissing(true); return; }
    createClient().rpc('get_balance_link', { p_token: token }).then(({ data, error }) => (error || !data ? setMissing(true) : setData(data)));
  }, [token]);

  if (missing) return <p className="p-6 text-center text-gray-600">This link doesn&apos;t work any more.</p>;
  if (!data) return <div className="max-w-3xl mx-auto p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}</div>;

  const currency = data.group.currency || 'INR';
  setActiveCurrency(currency);
  const persons: BalancePerson[] = [
    ...data.members.map((m: any) => ({ id: m.id, name: m.name })),
    ...data.pending.map((p: any) => ({ id: p.id, name: p.name, is_pending: true })),
  ];
  const expenses = data.expenses.map((e: any) => ({ ...e, participants: e.participants ?? [] }));
  const balances = calculateGroupBalances(expenses, persons, data.settlements);
  const direct = directDebts(expenses, persons, data.settlements);
  const plan = data.group.simplify_debts ? smartSettle(balances, direct) : direct;

  return <Statement tripName={data.group.name} currency={currency} persons={persons} expenses={expenses} payments={data.settlements} plan={plan} />;
}
