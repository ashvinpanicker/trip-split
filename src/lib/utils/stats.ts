import { CATEGORIES, categoryOf, payerIdOf, toPaise, type BalancePerson } from './balance';
import type { Expense, ExpenseParticipant } from '@/types';

type StatExpense = Pick<Expense, 'id' | 'title' | 'amount' | 'date' | 'category' | 'paid_by' | 'paid_by_pending' | 'created_by'> & {
  participants: Pick<ExpenseParticipant, 'user_id' | 'pending_member_id' | 'share_amount'>[];
};

export type PersonTotal = { id: string; name: string; total: number };
export type Award = { emoji: string; title: string; who: string; whoId: string; detail: string };

const sumPaise = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
const rupees = (p: number) => p / 100;

/** Fun, accurate trip numbers. Every breakdown sums exactly to the trip total. */
export function tripStats(expenses: StatExpense[], persons: BalancePerson[]) {
  const name = (id: string) => persons.find((p) => p.id === id)?.name ?? 'Someone';
  const totalP = sumPaise(expenses.map((e) => toPaise(e.amount)));

  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) || 0) + v);
  const byCat = new Map<string, number>();
  const byDay = new Map<string, number>();
  const paid = new Map<string, number>();
  const consumed = new Map<string, number>();
  const catShare = new Map<string, Map<string, number>>(); // category → person → paise
  const logged = new Map<string, number>();

  for (const e of expenses) {
    const amt = toPaise(e.amount);
    const cat = categoryOf(e.category).key;
    add(byCat, cat, amt);
    add(byDay, e.date, amt);
    const payer = payerIdOf(e);
    if (payer) add(paid, payer, amt);
    if (e.created_by) add(logged, e.created_by, 1);
    for (const p of e.participants) {
      const id = p.user_id ?? p.pending_member_id;
      if (!id) continue;
      const share = toPaise(p.share_amount);
      add(consumed, id, share);
      if (!catShare.has(cat)) catShare.set(cat, new Map());
      add(catShare.get(cat)!, id, share);
    }
  }

  const ranked = (m: Map<string, number>): PersonTotal[] =>
    [...m.entries()].filter(([, v]) => v > 0).map(([id, v]) => ({ id, name: name(id), total: rupees(v) })).sort((a, b) => b.total - a.total);

  const days = [...byDay.keys()].sort();
  const people = Math.max(persons.length, 1);
  const biggest = expenses.reduce<StatExpense | null>((b, e) => (!b || toPaise(e.amount) > toPaise(b.amount) ? e : b), null);

  const awards: Award[] = [];
  const top = (m: Map<string, number> | undefined) => {
    const r = m ? ranked(m) : [];
    return r.length && r[0].total > 0 ? r[0] : null;
  };
  const push = (emoji: string, title: string, t: PersonTotal | null, detail: (t: PersonTotal) => string) => {
    if (t) awards.push({ emoji, title, who: t.name, whoId: t.id, detail: detail(t) });
  };
  push('🏦', 'The group bank', top(paid), () => 'paid the most upfront');
  push('🍺', 'Chief Beer Officer', top(catShare.get('drinks')), () => 'biggest share of drinks');
  push('🍛', 'Foodie-in-chief', top(catShare.get('food')), () => 'biggest share of food');
  push('🏄', 'Thrill seeker', top(catShare.get('activities')), () => 'biggest share of activities');
  push('🛍️', 'Shopaholic', top(catShare.get('shopping')), () => 'biggest share of shopping');
  push('🛵', 'Road warrior', top(catShare.get('travel')), () => 'biggest share of travel');
  const acct = [...logged.entries()].sort((a, b) => b[1] - a[1])[0];
  if (acct && acct[1] > 1) awards.push({ emoji: '🧾', title: 'The accountant', who: name(acct[0]), whoId: acct[0], detail: `logged ${acct[1]} expenses` });

  return {
    total: rupees(totalP),
    count: expenses.length,
    perHead: rupees(Math.round(totalP / people)),
    days: days.length,
    perDay: days.length ? rupees(Math.round(totalP / days.length)) : 0,
    firstDay: days[0] ?? null,
    lastDay: days[days.length - 1] ?? null,
    byCategory: CATEGORIES.map((c) => ({ key: c.key, label: c.label, emoji: c.emoji, total: rupees(byCat.get(c.key) || 0) }))
      .filter((c) => c.total > 0).sort((a, b) => b.total - a.total),
    byDay: days.map((d) => ({ date: d, total: rupees(byDay.get(d) || 0) })),
    paidUpfront: ranked(paid),
    spent: ranked(consumed),
    biggest: biggest ? { title: biggest.title, amount: Number(biggest.amount), payer: name(payerIdOf(biggest) ?? '') } : null,
    awards,
  };
}

export type TripStats = ReturnType<typeof tripStats>;

/** Expenses matching a search box + filters (title or notes, payer, category). */
export function filterExpenses<T extends Pick<Expense, 'title' | 'notes' | 'category' | 'paid_by' | 'paid_by_pending'>>(
  expenses: T[],
  { query = '', category = null, payer = null }: { query?: string; category?: string | null; payer?: string | null }
): T[] {
  const q = query.trim().toLowerCase();
  return expenses.filter((e) =>
    (!q || e.title.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q)) &&
    (!category || categoryOf(e.category).key === category) &&
    (!payer || payerIdOf(e) === payer));
}
