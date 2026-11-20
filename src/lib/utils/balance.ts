import type { Balance, Expense, ExpenseParticipant, Settlement, SettlementRecord, SplitType } from '@/types';

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

/** Rupees → integer paise. All money maths runs in paise to avoid float drift. */
export const toPaise = (rupees: number | string) => Math.round(Number(rupees) * 100);
const toRupees = (paise: number) => paise / 100;

export function calculateGroupBalances(
  expenses: (Pick<Expense, 'paid_by' | 'paid_by_pending'> & { participants: Pick<ExpenseParticipant, 'user_id' | 'pending_member_id' | 'share_amount'>[] })[],
  persons: BalancePerson[],
  settlements: Pick<SettlementRecord, 'from_person' | 'to_person' | 'amount'>[] = []
): Balance[] {
  const net: Record<string, number> = {}; // paise
  for (const p of persons) net[p.id] = 0;
  const bump = (id: string, paise: number) => { net[id] = (net[id] || 0) + paise; };

  for (const expense of expenses) {
    const payerId = payerIdOf(expense);
    if (!payerId) continue;
    for (const participant of expense.participants) {
      // A claimed pending slot has both ids set; the real user wins
      const uid = participant.user_id ?? participant.pending_member_id;
      if (!uid || uid === payerId) continue;
      const share = toPaise(participant.share_amount);
      bump(payerId, share);
      bump(uid, -share);
    }
  }

  // Recorded payments: debtor paid creditor, so debtor's balance goes up
  for (const s of settlements) {
    const amt = toPaise(s.amount);
    bump(s.from_person, amt);
    bump(s.to_person, -amt);
  }

  return persons.map((p) => ({
    person_id: p.id,
    user_name: p.name,
    avatar_url: p.avatar_url ?? null,
    net_balance: toRupees(net[p.id] || 0),
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

/** Equal split in whole paise; leftover paise go one each to the first people in the list. Always sums to the total. */
export function calculateEqualSplits(totalAmount: number, keys: string[]): Record<string, number> {
  const n = keys.length;
  if (n === 0) return {};
  const total = toPaise(totalAmount);
  const base = Math.floor(total / n);
  const extra = total - base * n;
  const splits: Record<string, number> = {};
  keys.forEach((k, i) => { splits[k] = toRupees(base + (i < extra ? 1 : 0)); });
  return splits;
}

/**
 * Percentage split using largest-remainder rounding. Shares are proportional to the
 * percentages and always sum exactly to the total (validateSplit makes sure they're ~100%).
 */
export function calculatePercentageSplits(totalAmount: number, percentages: Record<string, number>): Record<string, number> {
  const total = toPaise(totalAmount);
  const entries = Object.entries(percentages);
  const pctSum = entries.reduce((s, [, p]) => s + p, 0);
  if (!entries.length || pctSum <= 0) return Object.fromEntries(entries.map(([k]) => [k, 0]));
  const target = total;
  const raw = entries.map(([k, p]) => ({ k, exact: (total * p) / pctSum }));
  const floors = raw.map((r) => ({ ...r, paise: Math.floor(r.exact + 1e-9) }));
  let left = target - floors.reduce((s, r) => s + r.paise, 0);
  [...floors]
    .sort((a, b) => (b.exact - b.paise) - (a.exact - a.paise))
    .forEach((r) => { if (left > 0) { r.paise += 1; left -= 1; } });
  return Object.fromEntries(floors.map((r) => [r.k, toRupees(r.paise)]));
}

export type SplitEntry = { key: string; percentage?: string | number; amount?: string | number };

/** Shares (in rupees) for the included people, by split type. */
export function computeShares(splitType: SplitType, totalAmount: number, entries: SplitEntry[]): Record<string, number> {
  if (splitType === 'equal') return calculateEqualSplits(totalAmount, entries.map((e) => e.key));
  if (splitType === 'percentage') {
    return calculatePercentageSplits(totalAmount, Object.fromEntries(entries.map((e) => [e.key, Number(e.percentage) || 0])));
  }
  return Object.fromEntries(entries.map((e) => [e.key, toRupees(toPaise(Number(e.amount) || 0))]));
}

/** Returns an error message, or null when the split adds up exactly. */
export function validateSplit(splitType: SplitType, totalAmount: number, entries: SplitEntry[]): string | null {
  const total = toPaise(totalAmount);
  if (!(total > 0)) return 'Enter a valid amount';
  if (!entries.length) return 'Select at least one participant';
  if (splitType === 'percentage') {
    const pct = entries.reduce((s, e) => s + (Number(e.percentage) || 0), 0);
    if (entries.some((e) => (Number(e.percentage) || 0) < 0)) return 'Percentages can’t be negative';
    // Percentages are stored to 2 decimals, so allow the rounding that brings back (e.g. 33.33 × 3)
    if (Math.abs(pct - 100) > 0.005 * entries.length + 1e-9) return `Percentages must add up to 100% (currently ${+pct.toFixed(2)}%)`;
  }
  if (splitType === 'fixed') {
    if (entries.some((e) => (Number(e.amount) || 0) < 0)) return 'Amounts can’t be negative';
    const sum = entries.reduce((s, e) => s + toPaise(Number(e.amount) || 0), 0);
    if (sum !== total) {
      const diff = toRupees(total - sum);
      return `Amounts must add up to ${formatCurrency(toRupees(total))} (${diff > 0 ? `${formatCurrency(diff)} left` : `${formatCurrency(-diff)} over`})`;
    }
  }
  const shares = computeShares(splitType, totalAmount, entries);
  const sum = Object.values(shares).reduce((s, v) => s + toPaise(v), 0);
  if (sum !== total) return 'Split doesn’t add up — please check the amounts';
  return null;
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
