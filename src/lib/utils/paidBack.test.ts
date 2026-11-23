import { describe, expect, it } from 'vitest';
import { copayNote, copaysByExpense, paidBackMap, paidBackNote } from './paidBack';
import { calculateGroupBalances } from './balance';

const dinner = { id: 'e1', title: 'Dinner', paid_by: 'a', paid_by_pending: null };
const lunch = { id: 'e2', title: 'Lunch', paid_by: 'b', paid_by_pending: null };

describe('paidBackMap', () => {
  it('uses expense_id when present', () => {
    const m = paidBackMap([{ from_person: 'b', to_person: 'a', note: null, expense_id: 'e1' }], [dinner, lunch]);
    expect([...m.get('e1')!]).toEqual(['b']);
  });

  it('falls back to the note, only to the payer', () => {
    const m = paidBackMap([
      { from_person: 'b', to_person: 'a', note: paidBackNote('Dinner'), expense_id: null },
      { from_person: 'c', to_person: 'b', note: paidBackNote('Dinner'), expense_id: null }, // wrong payee
    ], [dinner, lunch]);
    expect([...m.get('e1')!]).toEqual(['b']);
  });

  it('ignores an ambiguous note', () => {
    const m = paidBackMap([{ from_person: 'b', to_person: 'a', note: paidBackNote('Dinner'), expense_id: null }],
      [dinner, { ...dinner, id: 'e3' }]);
    expect(m.size).toBe(0);
  });
});

describe('paid on the spot', () => {
  it('leaves everyone settled for that bill', () => {
    const persons = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
    const expense = { paid_by: 'a', paid_by_pending: null, participants: ['a', 'b', 'c'].map((id) => ({ user_id: id, pending_member_id: null, share_amount: 1000 })) };
    const payments = ['b', 'c'].map((id) => ({ from_person: id, to_person: 'a', amount: 1000 }));
    expect(calculateGroupBalances([expense], persons, payments).every((b) => b.net_balance === 0)).toBe(true);
  });
});

describe('two people paid one bill', () => {
  it('is a payment from the co-payer to the payer, so balances come out right', () => {
    // Hotel ₹10,000: A paid 6,000, B paid 4,000, split equally between A, B, C
    const persons = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
    const hotel = { paid_by: 'a', paid_by_pending: null, participants: ['a', 'b', 'c'].map((id, i) => ({ user_id: id, pending_member_id: null, share_amount: i === 0 ? 3333.34 : 3333.33 })) };
    const b = calculateGroupBalances([hotel], persons, [{ from_person: 'b', to_person: 'a', amount: 4000 }]);
    expect(b.map((x) => x.net_balance)).toEqual([2666.66, 666.67, -3333.33]);
  });
  it('is not counted as paying back', () => {
    const rows = [{ from_person: 'b', to_person: 'a', amount: 4000, note: copayNote('Hotel'), expense_id: 'e1' }];
    expect(paidBackMap(rows, [{ id: 'e1', title: 'Hotel', paid_by: 'a', paid_by_pending: null }]).size).toBe(0);
    expect(copaysByExpense(rows).get('e1')).toEqual([{ person: 'b', amount: 4000 }]);
  });
});
