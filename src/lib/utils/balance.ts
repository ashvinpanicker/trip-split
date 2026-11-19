import type { Balance, Expense, ExpenseParticipant, Settlement, SettlementRecord } from '@/types';

export interface BalancePerson {
  id: string;         // user_id or pending_member id
  name: string;
  avatar_url?: string | null;
  is_pending?: boolean;
}

/** Payer id for an expense — a real user, or a pending member if they paid before signing up. */
export function payerIdOf(e: Pick<Expense, 'paid_by' | 'paid_by_pending'>): string | null {
  return e.paid_by ?? e.paid_by_pending ?? null;
}

export function calculateGroupBalances(
  expenses: (Pick<Expense, 'paid_by' | 'paid_by_pending'> & { participants: Pick<ExpenseParticipant, 'user_id' | 'pending_member_id' | 'share_amount'>[] })[],
  persons: BalancePerson[],
  settlements: Pick<SettlementRecord, 'from_person' | 'to_person' | 'amount'>[] = []
): Balance[] {
  const net: Record<string, number> = {};
  for (const p of persons) net[p.id] = 0;

  for (const expense of expenses) {
    const payerId = payerIdOf(expense);
    if (!payerId) continue;
    if (!(payerId in net)) net[payerId] = 0;

    for (const participant of expense.participants) {
      // Support both real users and pending members
      const uid = participant.user_id ?? participant.pending_member_id;
      if (!uid) continue;
      if (!(uid in net)) net[uid] = 0;

      if (uid !== payerId) {
        net[payerId] += Number(participant.share_amount);
        net[uid] -= Number(participant.share_amount);
      }
    }
  }

  // Recorded payments: debtor paid creditor, so debtor's balance goes up
  for (const s of settlements) {
    const amt = Number(s.amount);
    net[s.from_person] = (net[s.from_person] || 0) + amt;
    net[s.to_person] = (net[s.to_person] || 0) - amt;
  }

  return persons.map((p) => ({
    person_id: p.id,
    user_name: p.name,
    avatar_url: p.avatar_url ?? null,
    net_balance: Math.round((net[p.id] || 0) * 100) / 100,
    is_pending: p.is_pending,
  }));
}

export function simplifyDebts(balances: Balance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.net_balance > 0.01)
    .map((b) => ({ ...b, amount: b.net_balance }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((b) => b.net_balance < -0.01)
    .map((b) => ({ ...b, amount: -b.net_balance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0.01) {
      settlements.push({
        from_id: debtor.person_id,
        from_name: debtor.user_name,
        to_id: creditor.person_id,
        to_name: creditor.user_name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return settlements;
}

export function calculateEqualSplits(
  totalAmount: number,
  keys: string[]
): Record<string, number> {
  const n = keys.length;
  if (n === 0) return {};
  const base = Math.floor((totalAmount * 100) / n) / 100;
  const remainder = Math.round((totalAmount - base * n) * 100);
  const splits: Record<string, number> = {};
  keys.forEach((k, idx) => {
    splits[k] = base + (idx < remainder ? 0.01 : 0);
  });
  return splits;
}

export function calculatePercentageSplits(
  totalAmount: number,
  percentages: Record<string, number>
): Record<string, number> {
  const splits: Record<string, number> = {};
  for (const [k, pct] of Object.entries(percentages)) {
    splits[k] = Math.round(totalAmount * (pct / 100) * 100) / 100;
  }
  return splits;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const CATEGORIES = [
  { key: 'food', label: 'Food', emoji: '🍛' },
  { key: 'drinks', label: 'Drinks', emoji: '🍺' },
  { key: 'stay', label: 'Stay', emoji: '🏠' },
  { key: 'travel', label: 'Travel', emoji: '🛵' },
  { key: 'activities', label: 'Activities', emoji: '🏄' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { key: 'other', label: 'Other', emoji: '🧾' },
] as const;

export function categoryOf(key?: string | null) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** UPI deep link — opens GPay/PhonePe/Paytm with payee + amount prefilled. */
export function upiLink(upiId: string, name: string, amount: number, note: string) {
  const params = new URLSearchParams({
    pa: upiId.trim(),
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}
