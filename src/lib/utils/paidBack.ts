import type { Expense, SettlementRecord } from '@/types';
import { payerIdOf } from './balance';

/** Note on a payment made for one expense; also how we match it before the expense_id migration. */
export const paidBackNote = (title: string) => `Paid back: ${title}`.slice(0, 200);

/** Note on a payment that stands for part of the bill paid by someone else ("two cards, one hotel"). */
export const copayNote = (title: string) => `Also paid: ${title}`.slice(0, 200);
const isCopay = (note?: string | null) => !!note?.startsWith('Also paid: ');

/** expense id → who else paid part of it, and how much. */
export function copaysByExpense(payments: Pick<SettlementRecord, 'from_person' | 'amount' | 'note' | 'expense_id'>[]) {
  const out = new Map<string, { person: string; amount: number }[]>();
  for (const p of payments) {
    if (!p.expense_id || !isCopay(p.note)) continue;
    out.set(p.expense_id, [...(out.get(p.expense_id) ?? []), { person: p.from_person, amount: Number(p.amount) }]);
  }
  return out;
}

/** expense id → people who've paid the payer back for it. */
export function paidBackMap(
  payments: Pick<SettlementRecord, 'from_person' | 'to_person' | 'note' | 'expense_id'>[],
  expenses: Pick<Expense, 'id' | 'title' | 'paid_by' | 'paid_by_pending'>[]
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (id: string, who: string) => (out.get(id) ?? out.set(id, new Set()).get(id)!).add(who);
  const byNote = new Map<string, Pick<Expense, 'id' | 'paid_by' | 'paid_by_pending'>[]>();
  for (const e of expenses) {
    const k = paidBackNote(e.title);
    byNote.set(k, [...(byNote.get(k) ?? []), e]);
  }
  for (const p of payments) {
    if (isCopay(p.note)) continue;
    if (p.expense_id) { add(p.expense_id, p.from_person); continue; }
    // Older rows (no expense_id column yet): only trust the note when exactly one expense matches
    const hits = (p.note ? byNote.get(p.note) ?? [] : []).filter((e) => payerIdOf(e) === p.to_person);
    if (hits.length === 1) add(hits[0].id, p.from_person);
  }
  return out;
}

