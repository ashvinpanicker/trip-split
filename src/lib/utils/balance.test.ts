import { describe, expect, it } from 'vitest';
import {
  calculateEqualSplits,
  calculatePercentageSplits,
  calculateGroupBalances,
  computeShares,
  validateSplit,
  smartSettle,
  directDebts,
  toPaise,
  myNetByGroup,
  pairBreakdown,
  type BalancePerson,
} from './balance';
import type { Balance, Settlement } from '@/types';

// ── helpers ───────────────────────────────────────────────────────────
const paiseSum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + toPaise(v), 0);
const people = (...names: string[]): BalancePerson[] => names.map((n) => ({ id: n, name: n }));

type Exp = {
  paid_by: string | null;
  paid_by_pending: string | null;
  participants: { user_id: string | null; pending_member_id: string | null; share_amount: number }[];
};
/** Equal-split expense paid by `payer`, shared by `among`. */
const exp = (payer: string, amount: number, among: string[]): Exp => {
  const shares = calculateEqualSplits(amount, among);
  return {
    paid_by: payer,
    paid_by_pending: null,
    participants: among.map((id) => ({ user_id: id, pending_member_id: null, share_amount: shares[id] })),
  };
};
const netOf = (b: Balance[]) => Object.fromEntries(b.map((x) => [x.person_id, x.net_balance]));
const bal = (o: Record<string, number>): Balance[] =>
  Object.entries(o).map(([k, v]) => ({ person_id: k, user_name: k, avatar_url: null, net_balance: v }));

/** Apply a settle-up plan to balances; returns what's left per person in paise (should be all zero). */
const leftover = (b: Balance[], plan: Settlement[]) => {
  const net = Object.fromEntries(b.map((x) => [x.person_id, toPaise(x.net_balance)]));
  for (const s of plan) {
    net[s.from_id] += toPaise(s.amount);
    net[s.to_id] -= toPaise(s.amount);
  }
  return net;
};

// Seeded RNG so failures are reproducible
const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

// Independent brute force: max number of disjoint zero-sum groups (min payments = n − that)
function bruteMinPayments(cents: number[]): number {
  const v = cents.filter((c) => c !== 0);
  const best = (rest: number[]): number => {
    if (!rest.length) return 0;
    const [first, ...others] = rest;
    let top = 0;
    const m = others.length;
    for (let mask = 0; mask < 1 << m; mask++) {
      let s = first;
      const inGroup: number[] = [], out: number[] = [];
      others.forEach((x, i) => (mask & (1 << i) ? (s += x, inGroup.push(x)) : out.push(x)));
      if (s === 0) top = Math.max(top, 1 + best(out));
    }
    return top;
  };
  return v.length - best(v);
}

// ── equal splits ──────────────────────────────────────────────────────
describe('calculateEqualSplits', () => {
  it('splits evenly when it divides', () => {
    expect(calculateEqualSplits(300, ['a', 'b', 'c'])).toEqual({ a: 100, b: 100, c: 100 });
  });

  it('gives leftover paise to the first people and still sums exactly', () => {
    expect(calculateEqualSplits(100, ['a', 'b', 'c'])).toEqual({ a: 33.34, b: 33.33, c: 33.33 });
    expect(calculateEqualSplits(10, ['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual({
      a: 1.43, b: 1.43, c: 1.43, d: 1.43, e: 1.43, f: 1.43, g: 1.42,
    });
  });

  it('handles float traps (0.1, 0.29, 1.15, 4.35)', () => {
    for (const total of [0.1, 0.29, 1.15, 4.35, 19.99, 1234.56]) {
      for (let n = 1; n <= 11; n++) {
        const keys = [...Array(n)].map((_, i) => `p${i}`);
        const s = calculateEqualSplits(total, keys);
        expect(paiseSum(s)).toBe(toPaise(total));
        const vals = Object.values(s).map(toPaise);
        expect(Math.max(...vals) - Math.min(...vals)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('always sums exactly — 5,000 random cases', () => {
    const r = rng(1);
    for (let i = 0; i < 5000; i++) {
      const total = Math.round(r() * 5_000_000) / 100 + 0.01;
      const keys = [...Array(1 + Math.floor(r() * 12))].map((_, k) => `p${k}`);
      expect(paiseSum(calculateEqualSplits(total, keys))).toBe(toPaise(total));
    }
  });

  it('returns nothing for nobody', () => {
    expect(calculateEqualSplits(100, [])).toEqual({});
  });
});

// ── percentage splits ─────────────────────────────────────────────────
describe('calculatePercentageSplits', () => {
  it('33.33 / 33.33 / 33.34 of ₹100', () => {
    expect(calculatePercentageSplits(100, { a: 33.33, b: 33.33, c: 33.34 })).toEqual({ a: 33.33, b: 33.33, c: 33.34 });
  });

  it('three-way 33.3333% of ₹1000 does not lose a rupee', () => {
    const s = calculatePercentageSplits(1000, { a: 100 / 3, b: 100 / 3, c: 100 / 3 });
    expect(paiseSum(s)).toBe(100000);
  });

  it('50/50 of an odd paisa amount sums exactly', () => {
    const s = calculatePercentageSplits(0.01, { a: 50, b: 50 });
    expect(paiseSum(s)).toBe(1);
  });

  it('always sums exactly when percentages total 100 — 5,000 random cases', () => {
    const r = rng(2);
    for (let i = 0; i < 5000; i++) {
      const total = Math.round(r() * 5_000_000) / 100 + 0.01;
      const n = 1 + Math.floor(r() * 10);
      // random integer-cent percentages summing to exactly 100.00
      const cuts = [...Array(n - 1)].map(() => Math.floor(r() * 10001)).sort((a, b) => a - b);
      const bounds = [0, ...cuts, 10000];
      const pcts = Object.fromEntries(bounds.slice(1).map((b, k) => [`p${k}`, (b - bounds[k]) / 100]));
      const s = calculatePercentageSplits(total, pcts);
      expect(paiseSum(s)).toBe(toPaise(total));
      Object.values(s).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    }
  });
});

// ── validation ────────────────────────────────────────────────────────
describe('validateSplit', () => {
  const e = (...xs: [string, number][]) => xs.map(([key, v]) => ({ key, percentage: v, amount: v }));

  it('accepts exact percentage and fixed splits', () => {
    expect(validateSplit('percentage', 1000, e(['a', 60], ['b', 40]))).toBeNull();
    expect(validateSplit('fixed', 1000, e(['a', 600.5], ['b', 399.5]))).toBeNull();
    expect(validateSplit('equal', 999.99, e(['a', 0], ['b', 0], ['c', 0]))).toBeNull();
  });

  it('rejects percentages that are slightly off (used to slip through at 99.6%)', () => {
    expect(validateSplit('percentage', 1000, e(['a', 33.3], ['b', 33.3], ['c', 33.3]))).toMatch(/100%/);
    expect(validateSplit('percentage', 1000, e(['a', 60], ['b', 40.4]))).toMatch(/100%/);
  });

  it('accepts stored-and-reloaded percentages (33.33 × 3, 14.29 × 7) and still sums exactly', () => {
    const three = e(['a', 33.33], ['b', 33.33], ['c', 33.33]);
    expect(validateSplit('percentage', 1000, three)).toBeNull();
    expect(paiseSum(computeShares('percentage', 1000, three))).toBe(100000);
    const seven = [...Array(7)].map((_, i) => ({ key: `p${i}`, percentage: 14.29 }));
    expect(validateSplit('percentage', 999.99, seven)).toBeNull();
    expect(paiseSum(computeShares('percentage', 999.99, seven))).toBe(99999);
  });

  it('rejects fixed amounts off by even one paisa', () => {
    expect(validateSplit('fixed', 1000, e(['a', 500], ['b', 499.99]))).toMatch(/left/);
    expect(validateSplit('fixed', 1000, e(['a', 500], ['b', 500.01]))).toMatch(/over/);
  });

  it('rejects negatives, zero totals and empty splits', () => {
    expect(validateSplit('fixed', 100, e(['a', 150], ['b', -50]))).toMatch(/negative/);
    expect(validateSplit('percentage', 100, e(['a', 150], ['b', -50]))).toMatch(/negative/);
    expect(validateSplit('equal', 0, e(['a', 0]))).toMatch(/valid amount/);
    expect(validateSplit('equal', 100, [])).toMatch(/participant/);
  });

  it('whatever validates, computeShares sums to the total', () => {
    const r = rng(3);
    for (let i = 0; i < 2000; i++) {
      const total = Math.round(r() * 1_000_000) / 100 + 0.01;
      const n = 1 + Math.floor(r() * 8);
      const entries = [...Array(n)].map((_, k) => ({ key: `p${k}`, percentage: 100 / n, amount: 0 }));
      for (const type of ['equal', 'percentage'] as const) {
        if (validateSplit(type, total, entries) === null) {
          expect(paiseSum(computeShares(type, total, entries))).toBe(toPaise(total));
        }
      }
    }
  });
});

// ── balances ──────────────────────────────────────────────────────────
describe('calculateGroupBalances', () => {
  it('hand-checked 3-person trip', () => {
    // A pays villa 9000 for all 3; B pays dinner 1500 for all 3; C pays cab 600 for A and C
    const ps = people('A', 'B', 'C');
    const b = netOf(calculateGroupBalances([
      exp('A', 9000, ['A', 'B', 'C']),
      exp('B', 1500, ['A', 'B', 'C']),
      exp('C', 600, ['A', 'C']),
    ], ps));
    // A: +6000 (villa) −500 (dinner) −300 (cab) = 5200
    // B: −3000 +1000 = −2000
    // C: −3000 −500 +300 = −3200
    expect(b).toEqual({ A: 5200, B: -2000, C: -3200 });
  });

  it('balances always sum to zero', () => {
    const r = rng(4);
    const ps = people(...[...Array(10)].map((_, i) => `p${i}`));
    for (let t = 0; t < 300; t++) {
      const exps = [...Array(1 + Math.floor(r() * 40))].map(() => {
        const among = ps.filter(() => r() < 0.6).map((p) => p.id);
        if (!among.length) among.push('p0');
        return exp(ps[Math.floor(r() * 10)].id, Math.round(r() * 2_000_000) / 100 + 0.01, among);
      });
      const total = calculateGroupBalances(exps, ps).reduce((s, x) => s + toPaise(x.net_balance), 0);
      expect(total).toBe(0);
    }
  });

  it('payer who is not part of the split is credited the whole amount', () => {
    expect(netOf(calculateGroupBalances([exp('A', 1000, ['B', 'C'])], people('A', 'B', 'C'))))
      .toEqual({ A: 1000, B: -500, C: -500 });
  });

  it('own share is not counted as a debt to yourself', () => {
    expect(netOf(calculateGroupBalances([exp('A', 1000, ['A'])], people('A', 'B')))).toEqual({ A: 0, B: 0 });
  });

  it('people who have not signed up can owe and can pay', () => {
    const ps: BalancePerson[] = [{ id: 'A', name: 'A' }, { id: 'P', name: 'P', is_pending: true }];
    const owes = { paid_by: 'A', paid_by_pending: null, participants: [
      { user_id: 'A', pending_member_id: null, share_amount: 500 },
      { user_id: null, pending_member_id: 'P', share_amount: 500 },
    ] };
    const pays = { paid_by: null, paid_by_pending: 'P', participants: [
      { user_id: 'A', pending_member_id: null, share_amount: 200 },
      { user_id: null, pending_member_id: 'P', share_amount: 200 },
    ] };
    expect(netOf(calculateGroupBalances([owes, pays], ps))).toEqual({ A: 300, P: -300 });
  });

  it('after someone claims their name, their old shares count as theirs (user_id wins)', () => {
    const claimed = { paid_by: 'A', paid_by_pending: null, participants: [
      { user_id: 'A', pending_member_id: null, share_amount: 500 },
      { user_id: 'U', pending_member_id: 'P', share_amount: 500 },
    ] };
    expect(netOf(calculateGroupBalances([claimed], people('A', 'U')))).toEqual({ A: 500, U: -500 });
  });

  it('recorded payments reduce what is owed', () => {
    const exps = [exp('A', 900, ['A', 'B', 'C'])];
    const ps = people('A', 'B', 'C');
    expect(netOf(calculateGroupBalances(exps, ps, [{ from_person: 'B', to_person: 'A', amount: 300 }])))
      .toEqual({ A: 300, B: 0, C: -300 });
    // over-paying flips the direction rather than vanishing
    expect(netOf(calculateGroupBalances(exps, ps, [{ from_person: 'C', to_person: 'A', amount: 400 }])))
      .toEqual({ A: 200, B: -300, C: 100 });
  });

  it('accepts amounts as strings (Postgres numeric comes back as text)', () => {
    const e = { paid_by: 'A', paid_by_pending: null, participants: [
      { user_id: 'B', pending_member_id: null, share_amount: '33.33' as unknown as number },
    ] };
    expect(netOf(calculateGroupBalances([e], people('A', 'B')))).toEqual({ A: 33.33, B: -33.33 });
  });
});

// ── smart settle-up ───────────────────────────────────────────────────
describe('smartSettle', () => {
  it('nothing to do when everyone is square', () => {
    expect(smartSettle(bal({ A: 0, B: 0 }))).toEqual([]);
  });

  it('pairs that cancel are settled directly (3 payments, not 4)', () => {
    const b = bal({ A: 300, B: -300, C: 500, D: -200, E: -300 });
    const plan = smartSettle(b);
    expect(plan).toHaveLength(3);
    expect(Object.values(leftover(b, plan)).every((v) => v === 0)).toBe(true);
  });

  it('every payment is positive and goes from a debtor to a creditor', () => {
    const b = bal({ A: 1000, B: -250.5, C: -749.5 });
    for (const s of smartSettle(b)) {
      expect(s.amount).toBeGreaterThan(0);
      expect(netOf(b)[s.from_id]).toBeLessThan(0);
      expect(netOf(b)[s.to_id]).toBeGreaterThan(0);
    }
  });

  it('clears every balance to the paisa and uses the true minimum — 1,000 random groups', () => {
    const r = rng(5);
    for (let t = 0; t < 1000; t++) {
      const n = 2 + Math.floor(r() * 7); // brute force is exponential; keep ≤ 8 people here
      // integer-rupee balances make cancelling groups common, which is where smart beats greedy
      const vals = [...Array(n - 1)].map(() => Math.round((r() - 0.5) * 20) * 100);
      vals.push(-vals.reduce((s, v) => s + v, 0));
      const b = bal(Object.fromEntries(vals.map((v, i) => [`p${i}`, v / 100])));
      const plan = smartSettle(b);
      expect(Object.values(leftover(b, plan)).every((v) => v === 0)).toBe(true);
      expect(plan.length).toBe(bruteMinPayments(vals));
    }
  });

  it('handles a 10-person trip quickly and never needs more than n−1 payments', () => {
    const r = rng(6);
    const ps = people(...[...Array(10)].map((_, i) => `p${i}`));
    for (let t = 0; t < 200; t++) {
      const exps = [...Array(30)].map(() => exp(ps[Math.floor(r() * 10)].id, Math.round(r() * 1_000_000) / 100 + 1, ps.filter(() => r() < 0.7).map((p) => p.id).concat('p0')));
      const b = calculateGroupBalances(exps, ps);
      const start = performance.now();
      const plan = smartSettle(b);
      expect(performance.now() - start).toBeLessThan(200);
      expect(Object.values(leftover(b, plan)).every((v) => v === 0)).toBe(true);
      expect(plan.length).toBeLessThanOrEqual(b.filter((x) => x.net_balance !== 0).length - 1);
    }
  });

  it('falls back safely for very large groups (20 people)', () => {
    const vals = [...Array(19)].map((_, i) => (i % 2 ? 1 : -1) * (i + 1) * 100);
    vals.push(-vals.reduce((s, v) => s + v, 0));
    const b = bal(Object.fromEntries(vals.map((v, i) => [`p${i}`, v / 100])));
    expect(Object.values(leftover(b, smartSettle(b))).every((v) => v === 0)).toBe(true);
  });
});

// ── direct (no simplification) ────────────────────────────────────────
describe('directDebts', () => {
  it('nets each pair to a single payment', () => {
    const ps = people('A', 'B');
    const plan = directDebts([exp('A', 1000, ['A', 'B']), exp('B', 400, ['A', 'B'])], ps);
    expect(plan).toEqual([{ from_id: 'B', from_name: 'B', to_id: 'A', to_name: 'A', amount: 300 }]);
  });

  it('settles the same balances as the smart plan', () => {
    const r = rng(7);
    const ps = people(...[...Array(8)].map((_, i) => `p${i}`));
    for (let t = 0; t < 300; t++) {
      const exps = [...Array(1 + Math.floor(r() * 25))].map(() => exp(ps[Math.floor(r() * 8)].id, Math.round(r() * 500_000) / 100 + 1, ps.filter(() => r() < 0.6).map((p) => p.id).concat('p1')));
      const pays = r() < 0.5 ? [{ from_person: 'p2', to_person: 'p3', amount: Math.round(r() * 10000) / 100 + 1 }] : [];
      const b = calculateGroupBalances(exps, ps, pays);
      const direct = directDebts(exps, ps, pays);
      expect(Object.values(leftover(b, direct)).every((v) => v === 0)).toBe(true);
      expect(smartSettle(b).length).toBeLessThanOrEqual(direct.length);
    }
  });
});

// ── dashboard totals ──────────────────────────────────────────────────
describe('myNetByGroup', () => {
  const withGroup = (g: string, e: Exp) => ({ ...e, group_id: g });

  it('agrees with the group page for every person, every group — 300 random trips', () => {
    const r = rng(8);
    const ps = people(...[...Array(9)].map((_, i) => `p${i}`));
    for (let t = 0; t < 300; t++) {
      const exps = [...Array(1 + Math.floor(r() * 20))].map(() =>
        withGroup(r() < 0.5 ? 'g1' : 'g2', exp(ps[Math.floor(r() * 9)].id, Math.round(r() * 300_000) / 100 + 1, ps.filter(() => r() < 0.5).map((p) => p.id).concat('p4'))));
      const pays = [{ group_id: 'g1', from_person: 'p1', to_person: 'p0', amount: 123.45 }];
      for (const g of ['g1', 'g2']) {
        const groupBal = netOf(calculateGroupBalances(exps.filter((e) => e.group_id === g), ps, pays.filter((p) => p.group_id === g)));
        for (const p of ps) expect(myNetByGroup(p.id, exps, pays)[g] ?? 0).toBe(groupBal[p.id]);
      }
    }
  });

  it('counts money I paid for others even when I am not in the split', () => {
    expect(myNetByGroup('A', [withGroup('g', exp('A', 1000, ['B', 'C']))])).toEqual({ g: 1000 });
  });

  it('recorded payments clear the dashboard too', () => {
    const e = [withGroup('g', exp('A', 1000, ['A', 'B']))];
    expect(myNetByGroup('A', e, [{ group_id: 'g', from_person: 'B', to_person: 'A', amount: 500 }])).toEqual({ g: 0 });
  });
});

// ── simplified plans keep real debts where they can ───────────────────
describe('smartSettle with real-debt preference', () => {
  it('keeps "Rahul pays me for breakfast" instead of rerouting it', () => {
    // Me paid breakfast for Rahul (1000). Andrews paid for Rahul (500) and Garg (1500).
    const ps = people('Me', 'Andrews', 'Rahul', 'Garg');
    const exps = [exp('Me', 1000, ['Rahul']), exp('Andrews', 500, ['Rahul']), exp('Andrews', 1500, ['Garg'])];
    const b = calculateGroupBalances(exps, ps);
    const direct = directDebts(exps, ps);
    const plan = smartSettle(b, direct);
    expect(plan.length).toBe(smartSettle(b).length); // still the minimum
    const real = new Set(direct.map((d) => `${d.from_id}>${d.to_id}`));
    expect(plan.every((p) => real.has(`${p.from_id}>${p.to_id}`))).toBe(true);
    expect(plan).toContainEqual(expect.objectContaining({ from_id: 'Rahul', to_id: 'Me', amount: 1000 }));
  });

  it('never costs an extra payment and still clears everyone — 1,000 random trips vs brute force', () => {
    const r = rng(9);
    const ps = people(...[...Array(7)].map((_, i) => `p${i}`));
    for (let t = 0; t < 1000; t++) {
      const exps = [...Array(1 + Math.floor(r() * 10))].map(() =>
        exp(ps[Math.floor(r() * 7)].id, Math.round(r() * 20) * 100 + 100, ps.filter(() => r() < 0.5).map((p) => p.id).concat('p3')));
      const b = calculateGroupBalances(exps, ps);
      const plan = smartSettle(b, directDebts(exps, ps));
      expect(Object.values(leftover(b, plan)).every((v) => v === 0)).toBe(true);
      expect(plan.length).toBe(bruteMinPayments(b.map((x) => toPaise(x.net_balance))));
    }
  });
});

// ── per-person breakdown ──────────────────────────────────────────────
describe('pairBreakdown', () => {
  const withMeta = (e: Exp, i: number) => ({ ...e, id: `e${i}`, title: `Expense ${i}`, date: `2026-11-${10 + i}` });

  it('breakfast for two: Rahul owes me half', () => {
    const exps = [withMeta(exp('Me', 2600, ['Me', 'Rahul']), 0)];
    const { items, net } = pairBreakdown('Me', 'Rahul', exps);
    expect(net).toBe(1300);
    expect(items).toEqual([{ kind: 'expense', id: 'e0', title: 'Expense 0', date: '2026-11-10', amount: 1300 }]);
  });

  it('nets both directions and payments', () => {
    const exps = [withMeta(exp('Me', 2600, ['Me', 'Rahul']), 0), withMeta(exp('Rahul', 600, ['Me', 'Rahul']), 1)];
    expect(pairBreakdown('Me', 'Rahul', exps, [{ from_person: 'Rahul', to_person: 'Me', amount: 500 }]).net).toBe(500);
    expect(pairBreakdown('Rahul', 'Me', exps).net).toBe(-1000);
  });

  it('always matches directDebts for every pair — 300 random trips', () => {
    const r = rng(10);
    const ps = people(...[...Array(6)].map((_, i) => `p${i}`));
    for (let t = 0; t < 300; t++) {
      const exps = [...Array(1 + Math.floor(r() * 15))].map((_, i) =>
        withMeta(exp(ps[Math.floor(r() * 6)].id, Math.round(r() * 300_000) / 100 + 1, [...new Set(ps.filter(() => r() < 0.6).map((p) => p.id).concat('p2'))]), i));
      const pays = [{ from_person: 'p1', to_person: 'p0', amount: 77.77 }];
      const direct = directDebts(exps, ps, pays);
      for (const a of ps) for (const b of ps) {
        if (a.id === b.id) continue;
        const d = direct.find((x) => x.from_id === b.id && x.to_id === a.id)?.amount ?? 0;
        const rev = direct.find((x) => x.from_id === a.id && x.to_id === b.id)?.amount ?? 0;
        expect(pairBreakdown(a.id, b.id, exps, pays).net).toBe(toPaise(d - rev) / 100);
      }
    }
  });
});

// ── itemized bills ────────────────────────────────────────────────────
import { itemizedShares } from './balance';
describe('itemizedShares', () => {
  it('Goa dinner: items to the people who had them, service charge in proportion', () => {
    const { shares, subtotal, total } = itemizedShares([
      { name: 'Fish thali', price: 450, people: ['A'] },
      { name: 'Prawn curry', price: 600, people: ['B', 'C'] },
      { name: 'Beers', price: 900, people: ['A', 'B', 'C'] },
    ], 195); // 10% service
    expect(subtotal).toBe(1950);
    expect(total).toBe(2145);
    // A: 450 + 300 = 750 → +75; B: 300 + 300 = 600 → +60; C: 600 → +60
    expect(shares).toEqual({ A: 825, B: 660, C: 660 });
  });

  it('a discount (negative extra) also sums exactly', () => {
    const { shares, total } = itemizedShares([{ name: 'x', price: 100, people: ['A', 'B', 'C'] }], -10);
    expect(total).toBe(90);
    expect(Object.values(shares).reduce((s, v) => s + toPaise(v), 0)).toBe(9000);
  });

  it('always sums to the total, never negative for positive extras — 3,000 random bills', () => {
    const r = rng(12);
    const ks = ['A', 'B', 'C', 'D', 'E'];
    for (let t = 0; t < 3000; t++) {
      const items = [...Array(1 + Math.floor(r() * 8))].map(() => ({
        name: 'i', price: Math.round(r() * 200000) / 100, people: ks.filter(() => r() < 0.5),
      }));
      const extra = Math.round(r() * 50000) / 100;
      const { shares, total } = itemizedShares(items, extra);
      const sum = Object.values(shares).reduce((s, v) => s + toPaise(v), 0);
      if (Object.keys(shares).length) expect(sum).toBe(toPaise(total));
      Object.values(shares).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
      // shares pass the same validation as a hand-entered exact split
      if (toPaise(total) > 0 && Object.keys(shares).length) {
        expect(validateSplit('fixed', total, Object.entries(shares).map(([key, amount]) => ({ key, amount })))).toBeNull();
      }
    }
  });
});
