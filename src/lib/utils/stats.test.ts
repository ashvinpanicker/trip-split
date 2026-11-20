import { describe, expect, it } from 'vitest';
import { tripStats, filterExpenses } from './stats';
import { calculateEqualSplits, toPaise } from './balance';

const people = ['A', 'B', 'C', 'D'].map((n) => ({ id: n, name: n }));
let n = 0;
const exp = (payer: string, amount: number, among: string[], category: string, date = '2026-11-21', title = `E${n}`) => {
  const s = calculateEqualSplits(amount, among);
  return {
    id: `e${n++}`, title, amount, date, category, paid_by: payer, paid_by_pending: null, created_by: payer, notes: null,
    participants: among.map((id) => ({ user_id: id, pending_member_id: null, share_amount: s[id] })),
  };
};
const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

describe('tripStats', () => {
  const trip = [
    exp('A', 4000, ['A', 'B', 'C', 'D'], 'stay', '2026-11-20', 'Villa'),
    exp('B', 1200, ['B', 'C', 'D'], 'drinks', '2026-11-20', 'Beers'),
    exp('C', 900, ['A', 'B', 'C'], 'food', '2026-11-21', 'Thali'),
    exp('A', 300, ['A', 'B'], 'food', '2026-11-21', 'Chai'),
  ];
  const s = tripStats(trip, people);

  it('hand-checked totals', () => {
    expect(s.total).toBe(6400);
    expect(s.count).toBe(4);
    expect(s.perHead).toBe(1600);
    expect(s.days).toBe(2);
    expect(s.perDay).toBe(3200);
    expect(s.byDay).toEqual([{ date: '2026-11-20', total: 5200 }, { date: '2026-11-21', total: 1200 }]);
    expect(s.byCategory.map((c) => [c.key, c.total])).toEqual([['stay', 4000], ['food', 1200], ['drinks', 1200]]); // ties keep category order
    expect(s.paidUpfront[0]).toEqual({ id: 'A', name: 'A', total: 4300 });
    expect(s.biggest).toEqual({ title: 'Villa', amount: 4000, payer: 'A' });
  });

  it('awards go to the right people', () => {
    const award = (t: string) => s.awards.find((a) => a.title === t)?.who;
    expect(award('The group bank')).toBe('A');
    expect(award('Chief Beer Officer')).toBe('B'); // B, C, D tie at 400; first wins deterministically
    expect(award('Foodie-in-chief')).toBe('A'); // A: 300 + 150 = 450 vs B 450? B: 300 + 150 = 450, C: 300
    expect(award('The accountant')).toBe('A');
    expect(award('Road warrior')).toBeUndefined();
  });

  it('every breakdown sums exactly to the total — 500 random trips', () => {
    const r = rng(11);
    const cats = ['food', 'drinks', 'stay', 'travel', 'activities', 'shopping', 'other'];
    for (let t = 0; t < 500; t++) {
      const exps = [...Array(1 + Math.floor(r() * 30))].map(() => {
        const among = [...new Set(people.filter(() => r() < 0.6).map((p) => p.id).concat('A'))];
        return exp(people[Math.floor(r() * 4)].id, Math.round(r() * 1_000_000) / 100 + 0.01, among, cats[Math.floor(r() * 7)], `2026-11-${10 + Math.floor(r() * 9)}`);
      });
      const st = tripStats(exps, people);
      const T = toPaise(st.total);
      const sum = (xs: { total: number }[]) => xs.reduce((s, x) => s + toPaise(x.total), 0);
      expect(sum(st.byCategory)).toBe(T);
      expect(sum(st.byDay)).toBe(T);
      expect(sum(st.paidUpfront)).toBe(T);
      expect(sum(st.spent)).toBe(T);
    }
  });

  it('empty trip is all zeros, no crash', () => {
    const e = tripStats([], people);
    expect([e.total, e.count, e.days, e.perDay, e.biggest, e.awards.length]).toEqual([0, 0, 0, 0, null, 0]);
  });
});

describe('filterExpenses', () => {
  const list = [
    { title: 'Beers at sunset', notes: null, category: 'drinks', paid_by: 'A', paid_by_pending: null },
    { title: 'Dinner', notes: 'fish thali', category: 'food', paid_by: 'B', paid_by_pending: null },
    { title: 'Scooter', notes: null, category: 'travel', paid_by: null, paid_by_pending: 'P' },
  ];
  it('matches title and notes, case-insensitive', () => {
    expect(filterExpenses(list, { query: 'BEER' }).map((e) => e.title)).toEqual(['Beers at sunset']);
    expect(filterExpenses(list, { query: 'thali' }).map((e) => e.title)).toEqual(['Dinner']);
  });
  it('filters by category and payer, including people without accounts', () => {
    expect(filterExpenses(list, { category: 'food' })).toHaveLength(1);
    expect(filterExpenses(list, { payer: 'P' }).map((e) => e.title)).toEqual(['Scooter']);
    expect(filterExpenses(list, {})).toHaveLength(3);
  });
});

import { expensesCsv } from './export';
describe('expensesCsv', () => {
  const ppl = [{ id: 'A', name: 'Aarav' }, { id: 'B', name: 'Meera, "M"' }];
  const rows = [
    { date: '2026-11-21', title: '=HYPERLINK("x")', amount: 100, category: 'food', paid_by: 'A', paid_by_pending: null, notes: 'line1\nline2',
      participants: [{ user_id: 'A', pending_member_id: null, share_amount: 33.34 }, { user_id: 'B', pending_member_id: null, share_amount: 66.66 }] },
    { date: '2026-11-20', title: 'Cab', amount: 50, category: 'travel', paid_by: 'B', paid_by_pending: null, notes: null,
      participants: [{ user_id: 'B', pending_member_id: null, share_amount: 50 }] },
  ];
  const csv = expensesCsv(rows, ppl, 'INR');
  const lines = csv.replace('﻿', '').trim().split('\r\n');

  it('header, sorted rows, totals that add up', () => {
    expect(lines[0]).toBe('Date,Expense,Category,Amount (INR),Paid by,Notes,Aarav share,"Meera, ""M"" share"');
    expect(lines[1].startsWith('2026-11-20,Cab,Travel,50.00,"Meera, ""M""",,,50.00')).toBe(true);
    expect(lines.at(-1)).toBe(',TOTAL,,150.00,,,33.34,116.66');
  });
  it('escapes newlines and blocks formula injection', () => {
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"line1\nline2"');
  });
});
