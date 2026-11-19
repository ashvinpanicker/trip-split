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

/** Settle a set of balances that sum to zero with greedy largest-debtor → largest-creditor matching. */
function greedySettle(people: { id: string; name: string; cents: number }[]): Settlement[] {
  const cred = people.filter((p) => p.cents > 0).map((p) => ({ ...p })).sort((a, b) => b.cents - a.cents);
  const debt = people.filter((p) => p.cents < 0).map((p) => ({ ...p, cents: -p.cents })).sort((a, b) => b.cents - a.cents);
  const out: Settlement[] = [];
  let i = 0, j = 0;
  while (i < cred.length && j < debt.length) {
    const amt = Math.min(cred[i].cents, debt[j].cents);
    if (amt > 0) out.push({ from_id: debt[j].id, from_name: debt[j].name, to_id: cred[i].id, to_name: cred[i].name, amount: amt / 100 });
    cred[i].cents -= amt; debt[j].cents -= amt;
    if (cred[i].cents === 0) i++;
    if (debt[j].cents === 0) j++;
  }
  return out;
}

/**
 * Smart settle-up: the fewest possible payments.
 * Minimum payments = (people with a non-zero balance) − (max number of groups that already
 * cancel out among themselves). We find that partition exactly for up to 14 people with
 * non-zero balances, then settle each group greedily. Larger groups fall back to greedy.
 */
export function smartSettle(balances: Balance[]): Settlement[] {
  const people = balances
    .map((b) => ({ id: b.person_id, name: b.user_name, cents: Math.round(b.net_balance * 100) }))
    .filter((p) => p.cents !== 0);
  // Rounding can leave the total a few paise off zero; absorb it into the biggest balance
  const drift = people.reduce((s, p) => s + p.cents, 0);
  if (drift !== 0 && people.length) {
    const big = people.reduce((a, b) => (Math.abs(b.cents) > Math.abs(a.cents) ? b : a));
    big.cents -= drift;
  }
  const live = people.filter((p) => p.cents !== 0);
  const n = live.length;
  if (n <= 2 || n > 14) return greedySettle(live);

  const full = (1 << n) - 1;
  const sum = new Int32Array(1 << n);
  for (let m = 1; m <= full; m++) {
    const low = m & -m;
    sum[m] = sum[m ^ low] + live[31 - Math.clz32(low)].cents;
  }

  // best[m] = max zero-sum parts that m (a zero-sum mask) splits into; pick[m] = the part holding m's lowest bit
  const best = new Int16Array(1 << n).fill(-1);
  const pick = new Int32Array(1 << n);
  best[0] = 0;
  const solve = (m: number): number => {
    if (best[m] >= 0) return best[m];
    const low = m & -m;
    const rest = m ^ low;
    let top = 1, choice = m;
    // enumerate submasks of rest; part = sub | low must be zero-sum and leave a zero-sum remainder
    for (let sub = rest; ; sub = (sub - 1) & rest) {
      const part = sub | low;
      if (part !== m && sum[part] === 0) {
        const v = 1 + solve(m ^ part);
        if (v > top) { top = v; choice = part; }
      }
      if (sub === 0) break;
    }
    best[m] = top; pick[m] = choice;
    return top;
  };
  solve(full);

  const out: Settlement[] = [];
  for (let m = full; m; ) {
    const part = pick[m];
    out.push(...greedySettle(live.filter((_, i) => part & (1 << i))));
    m ^= part;
  }
  return out;
}

/** Kept for existing callers. */
export const simplifyDebts = smartSettle;

/** Who owes whom with no simplification: every expense's shares owed to its payer, netted per pair. */
export function directDebts(
  expenses: (Pick<Expense, 'paid_by' | 'paid_by_pending'> & { participants: Pick<ExpenseParticipant, 'user_id' | 'pending_member_id' | 'share_amount'>[] })[],
  persons: BalancePerson[],
  settlements: Pick<SettlementRecord, 'from_person' | 'to_person' | 'amount'>[] = []
): Settlement[] {
  const owe = new Map<string, number>(); // "a|b" → cents a owes b
  const add = (a: string, b: string, cents: number) => {
    if (a === b) return;
    owe.set(`${a}|${b}`, (owe.get(`${a}|${b}`) || 0) + cents);
  };
  for (const e of expenses) {
    const payer = payerIdOf(e);
    if (!payer) continue;
    for (const p of e.participants) {
      const id = p.user_id ?? p.pending_member_id;
      if (id) add(id, payer, Math.round(Number(p.share_amount) * 100));
    }
  }
  for (const s of settlements) add(s.from_person, s.to_person, -Math.round(Number(s.amount) * 100));

  const name = (id: string) => persons.find((p) => p.id === id)?.name ?? 'Someone';
  const out: Settlement[] = [];
  const seen = new Set<string>();
  for (const key of owe.keys()) {
    const [a, b] = key.split('|');
    const pair = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(pair)) continue;
    seen.add(pair);
    const net = (owe.get(`${a}|${b}`) || 0) - (owe.get(`${b}|${a}`) || 0);
    if (net > 0) out.push({ from_id: a, from_name: name(a), to_id: b, to_name: name(b), amount: net / 100 });
    if (net < 0) out.push({ from_id: b, from_name: name(b), to_id: a, to_name: name(a), amount: -net / 100 });
  }
  return out.sort((x, y) => y.amount - x.amount);
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
