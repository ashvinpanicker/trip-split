import type { Balance, Expense, ExpenseParticipant, Profile, Settlement } from '@/types';

export function calculateGroupBalances(
  expenses: (Expense & { participants: ExpenseParticipant[] })[],
  members: Profile[]
): Balance[] {
  // net[userId] = amount others owe them (positive) or they owe others (negative)
  const net: Record<string, number> = {};
  for (const m of members) net[m.id] = 0;

  for (const expense of expenses) {
    const payerId = expense.paid_by;
    if (!(payerId in net)) net[payerId] = 0;

    for (const participant of expense.participants) {
      const uid = participant.user_id;
      if (!(uid in net)) net[uid] = 0;

      if (uid !== payerId) {
        net[payerId] += participant.share_amount;
        net[uid] -= participant.share_amount;
      }
    }
  }

  return members.map((m) => ({
    user_id: m.id,
    user_name: m.full_name || m.email,
    avatar_url: m.avatar_url,
    net_balance: Math.round((net[m.id] || 0) * 100) / 100,
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
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0.01) {
      settlements.push({
        from_user_id: debtor.user_id,
        from_user_name: debtor.user_name,
        to_user_id: creditor.user_id,
        to_user_name: creditor.user_name,
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
  participantIds: string[]
): Record<string, number> {
  const n = participantIds.length;
  if (n === 0) return {};
  const base = Math.floor((totalAmount * 100) / n) / 100;
  const remainder = Math.round((totalAmount - base * n) * 100);

  const splits: Record<string, number> = {};
  participantIds.forEach((id, idx) => {
    splits[id] = base + (idx < remainder ? 0.01 : 0);
  });
  return splits;
}

export function calculatePercentageSplits(
  totalAmount: number,
  percentages: Record<string, number>
): Record<string, number> {
  const splits: Record<string, number> = {};
  for (const [id, pct] of Object.entries(percentages)) {
    splits[id] = Math.round(totalAmount * (pct / 100) * 100) / 100;
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
