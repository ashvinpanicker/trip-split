import { describe, it, expect } from 'vitest';
import { statementRows } from './statement';
import { calculateGroupBalances } from './balance';

const A = 'a', B = 'b', C = 'c';
const persons = [{ id: A, name: 'Ash' }, { id: B, name: 'Rudi' }, { id: C, name: 'Sam' }];
const expenses = [
  { paid_by: A, amount: 36000, participants: [A, B, C].map((id) => ({ user_id: id, pending_member_id: null, share_amount: 12000 })) },
  { paid_by: B, amount: 900.5, participants: [
    { user_id: A, pending_member_id: null, share_amount: 300.17 },
    { user_id: B, pending_member_id: null, share_amount: 300.17 },
    { user_id: null, pending_member_id: C, share_amount: 300.16 },
  ] },
];
const payments = [{ from_person: C, to_person: A, amount: 6000 }];

describe('statementRows', () => {
  const s = statementRows(expenses, persons, payments);

  it('matches the balances the app shows', () => {
    const app = calculateGroupBalances(expenses as any, persons, payments);
    for (const r of s.rows) expect(r.net).toBeCloseTo(app.find((b) => b.person_id === r.id)!.net_balance, 2);
  });
  it('paid in total equals shares in total, and balances cancel out', () => {
    expect(s.checks).toEqual({ paidEqualsShares: true, netIsZero: true });
    expect(s.totals.paid).toBe(36900.5);
  });
  it('a payment sent reduces what you owe', () => {
    const sam = s.rows.find((r) => r.id === C)!;
    expect(sam).toMatchObject({ paid: 0, share: 12300.16, sent: 6000, received: 0, net: -6300.16 });
  });
});
