'use client';

import { tripPersons } from '@/lib/utils/people';
import { use } from 'react';
import Statement from '@/components/balances/Statement';
import { useGroup } from '@/hooks/useGroups';
import { useExpenses, useSettlements } from '@/hooks/useExpenses';
import { calculateGroupBalances, directDebts, settleModeOf, settlePlan, setActiveCurrency, type BalancePerson } from '@/lib/utils/balance';
import type { Expense, ExpenseParticipant } from '@/types';
import { readPayMethods, type PayMethod } from '@/lib/utils/payMethods';
import { useUser } from '@/hooks/useUser';

/** Printable settle-up statement for a trip (Save as PDF). */
export default function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { group, loading } = useGroup(id);
  const { expenses, loading: expLoading } = useExpenses(id);
  const { settlements: payments } = useSettlements(id);
  const { user } = useUser();

  if (loading || expLoading || !group) {
    return <div className="max-w-3xl mx-auto p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}</div>;
  }
  const currency = group.currency || 'INR';
  setActiveCurrency(currency);
  const persons = tripPersons(group);
  const exps = expenses.filter((e) => e.participants) as (Expense & { participants: ExpenseParticipant[] })[];
  const balances = calculateGroupBalances(exps, persons, payments);
  const direct = directDebts(exps, persons, payments);
  const plan = settlePlan(settleModeOf(group), balances, direct);

  const payMethods: Record<string, PayMethod[]> = {};
  for (const m of group.members || []) payMethods[m.user_id] = readPayMethods((m.profile as any)?.pay_methods, (m.profile as any)?.upi_id);

  return <Statement tripName={group.name} currency={currency} persons={persons} expenses={exps} payments={payments} plan={plan} payMethods={payMethods} me={user?.id} />;
}
