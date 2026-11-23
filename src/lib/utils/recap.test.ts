import { describe, expect, it } from 'vitest';
import { recapText, tripDates } from './recap';
import { tripStats } from './stats';

describe('trip recap', () => {
  it('formats dates in a range', () => {
    expect(tripDates('2026-11-22', '2026-11-25')).toBe('22–25 Nov 2026');
    expect(tripDates('2026-11-30', '2026-12-02')).toBe('30 Nov – 2 Dec 2026');
    expect(tripDates('2026-11-22', '2026-11-22')).toBe('22 Nov 2026');
  });

  it('says settled or lists what is open', () => {
    const persons = [{ id: 'a', name: 'Asha' }, { id: 'b', name: 'Ben' }];
    const stats = tripStats([{ id: 'e', title: 'Dinner', amount: 1000, date: '2026-11-22', category: 'food', paid_by: 'a', paid_by_pending: null, created_by: 'a',
      participants: [{ user_id: 'a', pending_member_id: null, share_amount: 500 }, { user_id: 'b', pending_member_id: null, share_amount: 500 }] }] as never, persons);
    const base = { name: 'Goa', people: 2, stats, link: 'https://x/g' };
    expect(recapText({ ...base, open: [] })).toContain('Everyone’s settled up');
    const open = recapText({ ...base, open: [{ from_id: 'b', from_name: 'Ben', to_id: 'a', to_name: 'Asha', amount: 500 }] });
    expect(open).toContain('Ben → Asha');
    expect(open).toContain('*Goa* is a wrap');
  });
});
