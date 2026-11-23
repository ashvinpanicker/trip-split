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

/** Sum per-group nets into totals per currency (amounts in different currencies are never added together). */
export function totalsByCurrency(perGroup: Record<string, number>, currencyOf: (groupId: string) => string) {
  const out: Record<string, { owed: number; owe: number; net: number }> = {};
  for (const [g, v] of Object.entries(perGroup)) {
    const c = currencyOf(g);
    const t = (out[c] ??= { owed: 0, owe: 0, net: 0 });
    const p = toPaise(v);
    if (p > 0) t.owed += p; else t.owe -= p;
    t.net += p;
  }
  for (const t of Object.values(out)) { t.owed /= 100; t.owe /= 100; t.net /= 100; }
  return out;
}

/**
 * My net balance per group (rupees): positive = I'm owed. Same rules as calculateGroupBalances,
 * just for one person, so the dashboard and the group page always agree.
 */
export function myNetByGroup(
  me: string,
  expenses: (Pick<Expense, 'group_id' | 'paid_by' | 'paid_by_pending'> & { participants: Pick<ExpenseParticipant, 'user_id' | 'pending_member_id' | 'share_amount'>[] })[],
  payments: Pick<SettlementRecord, 'group_id' | 'from_person' | 'to_person' | 'amount'>[] = []
): Record<string, number> {
  const net: Record<string, number> = {};
  const bump = (g: string, paise: number) => { net[g] = (net[g] || 0) + paise; };
  for (const e of expenses) {
    const payer = payerIdOf(e);
    if (!payer) continue;
    for (const p of e.participants) {
      const id = p.user_id ?? p.pending_member_id;
      if (!id || id === payer) continue;
      const share = toPaise(p.share_amount);
      if (payer === me) bump(e.group_id, share);
      if (id === me) bump(e.group_id, -share);
    }
  }
  for (const s of payments) {
    if (s.from_person === me) bump(s.group_id, toPaise(s.amount));
    if (s.to_person === me) bump(s.group_id, -toPaise(s.amount));
  }
  return Object.fromEntries(Object.entries(net).map(([g, v]) => [g, toRupees(v)]));
}

export type PairItem = { kind: 'expense' | 'payment'; id: string; title: string; date: string; amount: number };

/**
 * Everything between two people, from `me`'s side: positive = they owe me for it.
 * The items sum exactly to what directDebts says one owes the other.
 */
export function pairBreakdown(
  me: string,
  other: string,
  expenses: (Pick<Expense, 'id' | 'title' | 'date' | 'paid_by' | 'paid_by_pending'> & { participants: Pick<ExpenseParticipant, 'user_id' | 'pending_member_id' | 'share_amount'>[] })[],
  payments: (Pick<SettlementRecord, 'from_person' | 'to_person' | 'amount'> & { id?: string; date?: string })[] = []
): { items: PairItem[]; net: number } {
  const items: PairItem[] = [];
  for (const e of expenses) {
    const payer = payerIdOf(e);
    if (payer !== me && payer !== other) continue;
    const debtor = payer === me ? other : me;
    const share = e.participants.find((p) => (p.user_id ?? p.pending_member_id) === debtor);
    if (!share) continue;
    const paise = toPaise(share.share_amount);
    if (!paise) continue;
    items.push({ kind: 'expense', id: e.id, title: e.title, date: e.date, amount: toRupees(payer === me ? paise : -paise) });
  }
  payments.forEach((p, i) => {
    // They paid me → they owe me less; I paid them → they owe me more
    if (p.from_person === other && p.to_person === me) items.push({ kind: 'payment', id: p.id ?? `p${i}`, title: 'Payment', date: p.date ?? '', amount: -toRupees(toPaise(p.amount)) });
    if (p.from_person === me && p.to_person === other) items.push({ kind: 'payment', id: p.id ?? `p${i}`, title: 'Payment', date: p.date ?? '', amount: toRupees(toPaise(p.amount)) });
  });
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const net = toRupees(items.reduce((s, x) => s + toPaise(x.amount), 0));
  return { items, net };
}

type Owes = (fromId: string, toId: string) => number; // paise `from` directly owes `to` (0 if none)

/** Lexicographic "a is better than b". */
const beats = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
};

/**
 * Settle a set of balances that sum to zero. Every step zeroes at least one person, so a group
 * of k people never needs more than k − 1 payments. Among the valid choices at each step we
 * prefer a debtor → creditor pair that genuinely owes each other (so "Rahul pays me for
 * breakfast" survives simplification), then an exact match, then the biggest amount.
 */
function settleGroup(people: { id: string; name: string; cents: number }[], owes: Owes = () => 0): Settlement[] {
  const cred = people.filter((p) => p.cents > 0).map((p) => ({ ...p }));
  const debt = people.filter((p) => p.cents < 0).map((p) => ({ ...p, cents: -p.cents }));
  const out: Settlement[] = [];
  for (;;) {
    let best: { d: (typeof debt)[0]; c: (typeof cred)[0]; score: number[] } | null = null;
    for (const d of debt) {
      if (!d.cents) continue;
      for (const c of cred) {
        if (!c.cents) continue;
        const amt = Math.min(d.cents, c.cents);
        const direct = Math.min(owes(d.id, c.id), amt);
        const score = [direct > 0 ? 1 : 0, d.cents === c.cents ? 1 : 0, direct, amt];
        if (!best || beats(score, best.score)) {
          best = { d, c, score };
        }
      }
    }
    if (!best) break;
    const amt = Math.min(best.d.cents, best.c.cents);
    out.push({ from_id: best.d.id, from_name: best.d.name, to_id: best.c.id, to_name: best.c.name, amount: amt / 100 });
    best.d.cents -= amt;
    best.c.cents -= amt;
  }
  return out;
}

/**
 * Smart settle-up: the fewest possible payments.
 * Minimum payments = (people with a non-zero balance) − (max number of groups that already
 * cancel out among themselves). We find that partition exactly for up to 14 people with
 * non-zero balances, then settle each group greedily. Larger groups fall back to greedy.
 */
export function smartSettle(balances: Balance[], direct: Settlement[] = []): Settlement[] {
  // Who genuinely owes whom (from directDebts), used only to choose between equally short plans
  const owedMap = new Map(direct.map((s) => [`${s.from_id}|${s.to_id}`, toPaise(s.amount)]));
  const owes: Owes = (a, b) => owedMap.get(`${a}|${b}`) ?? 0;
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
  if (n <= 2 || n > 14) return settleGroup(live, owes);

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
    out.push(...settleGroup(live.filter((_, i) => part & (1 << i)), owes));
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

/**
 * A owes B, B owes C, C owes A: take the smallest amount off every step of the loop.
 * Everyone still only pays people who paid for them, balances don't change, and there are fewer payments.
 */
export function withoutLoops(direct: Settlement[]): Settlement[] {
  const edges = new Map<string, Map<string, number>>(); // edges[a][b] = paise a pays b
  for (const s of direct) (edges.get(s.from_id) ?? edges.set(s.from_id, new Map()).get(s.from_id)!).set(s.to_id, toPaise(s.amount));
  const findLoop = (): string[] | null => {
    const state = new Map<string, 1 | 2>(); // 1 = on the current path, 2 = done
    const path: string[] = [];
    const visit = (a: string): string[] | null => {
      state.set(a, 1);
      path.push(a);
      for (const b of edges.get(a)?.keys() ?? []) {
        if (state.get(b) === 1) return path.slice(path.indexOf(b));
        if (!state.has(b)) { const loop = visit(b); if (loop) return loop; }
      }
      state.set(a, 2);
      path.pop();
      return null;
    };
    for (const a of edges.keys()) if (!state.has(a)) { const loop = visit(a); if (loop) return loop; }
    return null;
  };
  // Each pass removes at least one payment, so this always finishes
  for (let loop = findLoop(); loop; loop = findLoop()) {
    const steps = loop.map((a, i) => [a, loop[(i + 1) % loop.length]] as const);
    const least = Math.min(...steps.map(([a, b]) => edges.get(a)!.get(b)!));
    for (const [a, b] of steps) {
      const left = edges.get(a)!.get(b)! - least;
      if (left) edges.get(a)!.set(b, left); else edges.get(a)!.delete(b);
    }
  }
  return direct
    .filter((s) => edges.get(s.from_id)?.has(s.to_id))
    .map((s) => ({ ...s, amount: edges.get(s.from_id)!.get(s.to_id)! / 100 }))
    .sort((x, y) => y.amount - x.amount);
}

/** How a trip settles up. Admins pick one in Group settings. */
export type SettleMode = 'direct' | 'loops' | 'fewest';
export const SETTLE_MODES: { key: SettleMode; label: string; hint: string }[] = [
  { key: 'loops', label: 'Pay back who paid for you', hint: 'Everyone only pays people who covered them. Debts that go round in a circle cancel out, so there are fewer payments.' },
  { key: 'direct', label: 'Exactly by person', hint: 'Pay back every person exactly what you owe them. Easiest to check, but the most payments.' },
  { key: 'fewest', label: 'Fewest payments', hint: 'The least transfers for everyone to be square. Some people pay someone who didn’t pay for them.' },
];
/** Older trips only have simplify_debts. */
export const settleModeOf = (g: { settle_mode?: string | null; simplify_debts?: boolean | null }): SettleMode =>
  g.settle_mode === 'direct' || g.settle_mode === 'loops' || g.settle_mode === 'fewest' ? g.settle_mode : g.simplify_debts ? 'fewest' : 'direct';

/** The plan everyone sees, for the trip's settle-up mode. `direct` is directDebts(...). */
export function settlePlan(mode: SettleMode, balances: Balance[], direct: Settlement[]): Settlement[] {
  if (mode === 'fewest') return smartSettle(balances, direct);
  return mode === 'loops' ? withoutLoops(direct) : direct;
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

export type BillItem = { name: string; price: number; people: string[] };

/** Split `total` paise across keys in proportion to `weights`, largest remainder first. Always sums to total. */
function allocate(total: number, weights: Record<string, number>): Record<string, number> {
  const keys = Object.keys(weights);
  const W = keys.reduce((s, k) => s + weights[k], 0);
  if (!keys.length || W <= 0) return Object.fromEntries(keys.map((k) => [k, 0]));
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const raw = keys.map((k) => ({ k, exact: (abs * weights[k]) / W }));
  const out = raw.map((r) => ({ ...r, p: Math.floor(r.exact + 1e-9) }));
  let left = abs - out.reduce((s, r) => s + r.p, 0);
  [...out].sort((a, b) => (b.exact - b.p) - (a.exact - a.p)).forEach((r) => { if (left > 0) { r.p += 1; left -= 1; } });
  return Object.fromEntries(out.map((r) => [r.k, sign * r.p]));
}

/**
 * Itemized bill: each item is shared equally by the people who had it; `extra` (tax, service,
 * tip, or a negative discount) is spread in proportion to what each person ordered.
 * Returns per-person shares in rupees that sum exactly to `total`.
 */
export function itemizedShares(items: BillItem[], extra = 0): { shares: Record<string, number>; subtotal: number; total: number } {
  const sub: Record<string, number> = {};
  let subtotal = 0;
  for (const it of items) {
    const price = toPaise(it.price);
    if (price <= 0 || it.people.length === 0) continue;
    subtotal += price;
    const base = Math.floor(price / it.people.length);
    let rem = price - base * it.people.length;
    for (const k of it.people) {
      sub[k] = (sub[k] || 0) + base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem -= 1;
    }
  }
  const extraP = toPaise(extra);
  const spread = allocate(extraP, sub);
  const shares = Object.fromEntries(Object.keys(sub).map((k) => [k, toRupees(sub[k] + (spread[k] || 0))]));
  return { shares, subtotal: toRupees(subtotal), total: toRupees(subtotal + extraP) };
}

/** weight: how many people this entry counts as in an equal split (a couple = 2). Default 1. */
export type SplitEntry = { key: string; percentage?: string | number; amount?: string | number; weight?: number };

/** Shares (in rupees) for the included people, by split type. */
export function computeShares(splitType: SplitType, totalAmount: number, entries: SplitEntry[]): Record<string, number> {
  if (splitType === 'equal') {
    // Weighted (someone counts as 2) is a proportional split; otherwise a plain equal one
    return entries.some((e) => (e.weight ?? 1) !== 1)
      ? calculatePercentageSplits(totalAmount, Object.fromEntries(entries.map((e) => [e.key, Math.max(0, e.weight ?? 1)])))
      : calculateEqualSplits(totalAmount, entries.map((e) => e.key));
  }
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

/** Currencies a group can display in. Symbol only: amounts are never converted. */
export const CURRENCIES = [
  { code: 'INR', label: 'Indian rupee' },
  { code: 'USD', label: 'US dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British pound' },
  { code: 'AED', label: 'UAE dirham' },
  { code: 'THB', label: 'Thai baht' },
  { code: 'SGD', label: 'Singapore dollar' },
  { code: 'MYR', label: 'Malaysian ringgit' },
  { code: 'IDR', label: 'Indonesian rupiah' },
  { code: 'VND', label: 'Vietnamese dong' },
  { code: 'LKR', label: 'Sri Lankan rupee' },
  { code: 'NPR', label: 'Nepalese rupee' },
  { code: 'BTN', label: 'Bhutanese ngultrum' },
  { code: 'KRW', label: 'South Korean won' },
  { code: 'JPY', label: 'Japanese yen' },
  { code: 'AUD', label: 'Australian dollar' },
  { code: 'CAD', label: 'Canadian dollar' },
] as const;

/** Currency used by formatCurrency when none is passed: the group currently on screen. */
let activeCurrency = 'INR';
export function setActiveCurrency(code?: string | null) {
  activeCurrency = code && /^[A-Z]{3}$/.test(code) ? code : 'INR';
}
export const getActiveCurrency = () => activeCurrency;

const formatters = new Map<string, Intl.NumberFormat>();
export function formatCurrency(amount: number, code: string = activeCurrency): string {
  let f = formatters.get(code);
  if (!f) {
    const noDecimals = ['KRW', 'JPY', 'VND', 'IDR'].includes(code);
    f = new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: noDecimals ? 0 : 2,
      maximumFractionDigits: 2,
    });
    formatters.set(code, f);
  }
  return f.format(amount);
}

/** Just the symbol, e.g. "₹", "$", "₩". */
export function currencySymbol(code: string = activeCurrency): string {
  return formatCurrency(0, code).replace(/[\d.,\s]/g, '') || code;
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

/** Short label for chips: first name, or the full name when two people share a first name. */
export function shortName(name: string, all: string[]): string {
  const first = (n: string) => n.trim().split(/\s+/)[0];
  const f = first(name);
  return all.filter((n) => first(n) === f).length > 1 ? name.trim() : f;
}
