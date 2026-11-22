'use client';

import { use } from 'react';
import Statement from '@/components/balances/Statement';
import { useGroup } from '@/hooks/useGroups';
import { useExpenses, useSettlements } from '@/hooks/useExpenses';
import { calculateGroupBalances, directDebts, smartSettle, setActiveCurrency, type BalancePerson } from '@/lib/utils/balance';
import type { Expense, ExpenseParticipant } from '@/types';

/** Printable settle-up statement for a trip (Save as PDF). */
export default function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { group, loading } = useGroup(id);
  const { expenses, loading: expLoading } = useExpenses(id);
  const { settlements: payments } = useSettlements(id);

  if (loading || expLoading || !group) {
    return <div className="max-w-3xl mx-auto p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}</div>;
  }
  const currency = group.currency || 'INR';
  setActiveCurrency(currency);
  const persons: BalancePerson[] = [
    ...(group.members || []).map((m: any) => ({ id: m.user_id, name: m.profile?.full_name || m.profile?.email || 'Unknown' })),
    ...(group.pending_members || []).filter((pm: any) => !pm.claimed_by).map((pm: any) => ({ id: pm.id, name: pm.name, is_pending: true })),
  ];
  const exps = expenses.filter((e) => e.participants) as (Expense & { participants: ExpenseParticipant[] })[];
  const balances = calculateGroupBalances(exps, persons, payments);
  const direct = directDebts(exps, persons, payments);
  const plan = group.simplify_debts ? smartSettle(balances, direct) : direct;

  return <Statement tripName={group.name} currency={currency} persons={persons} expenses={exps} payments={payments} plan={plan} />;
}
