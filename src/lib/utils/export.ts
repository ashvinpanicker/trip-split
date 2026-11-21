import { categoryOf, payerIdOf, toPaise, type BalancePerson } from './balance';
import type { Expense, ExpenseParticipant } from '@/types';

type CsvExpense = Pick<Expense, 'date' | 'title' | 'amount' | 'category' | 'paid_by' | 'paid_by_pending' | 'notes'> & {
  participants: Pick<ExpenseParticipant, 'user_id' | 'pending_member_id' | 'share_amount'>[];
};

const cell = (v: string | number) => {
  const s = String(v);
  // Quote anything with commas, quotes or newlines; neutralise spreadsheet formula injection
  const safe = /^[=+\-@]/.test(s) && typeof v === 'string' ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const money = (paise: number) => (paise / 100).toFixed(2);

/**
 * One row per expense: date, title, category, amount, who paid, then each person's share.
 * A final TOTAL row sums every column, so the file can be checked in any spreadsheet.
 */
export function expensesCsv(expenses: CsvExpense[], persons: BalancePerson[], currency: string): string {
  const name = (id: string | null) => persons.find((p) => p.id === id)?.name ?? '';
  const header = ['Date', 'Expense', 'Category', `Amount (${currency})`, 'Paid by', 'Notes', ...persons.map((p) => `${p.name} share`)];
  const rows: (string | number)[][] = [];
  const totals = new Array(persons.length).fill(0);
  let total = 0;

  for (const e of [...expenses].sort((a, b) => a.date.localeCompare(b.date))) {
    const shares = persons.map((p, i) => {
      const part = e.participants.find((x) => (x.user_id ?? x.pending_member_id) === p.id);
      const v = part ? toPaise(part.share_amount) : 0;
      totals[i] += v;
      return part ? money(v) : '';
    });
    total += toPaise(e.amount);
    rows.push([e.date, e.title, categoryOf(e.category).label, money(toPaise(e.amount)), name(payerIdOf(e)), e.notes ?? '', ...shares]);
  }
  rows.push(['', 'TOTAL', '', money(total), '', '', ...totals.map(money)]);
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
