import { calculateEqualSplits, calculateGroupBalances, directDebts, smartSettle } from '@/lib/utils/balance';

/** A realistic Goa weekend, run through the app's real (tested) balance engine. */
const people = ['Aarav', 'Meera', 'Kabir', 'Zoya', 'Rohan', 'Ishaan'].map((n) => ({ id: n, name: n }));
const all = people.map((p) => p.id);

export const demoExpenses = [
  { title: 'Villa, 3 nights', payer: 'Aarav', amount: 24000, among: all },
  { title: 'Scooter rentals', payer: 'Meera', amount: 3600, among: all },
  { title: 'Dinner at the shack', payer: 'Kabir', amount: 4200, among: all },
  { title: 'Beers at sunset', payer: 'Zoya', amount: 2400, among: ['Zoya', 'Rohan', 'Ishaan', 'Meera'] },
  { title: 'Parasailing', payer: 'Rohan', amount: 6000, among: ['Rohan', 'Kabir', 'Aarav'] },
  { title: 'Breakfast run', payer: 'Ishaan', amount: 1800, among: all },
  { title: 'Flea market', payer: 'Meera', amount: 1500, among: ['Meera', 'Zoya'] },
];

const expenses = demoExpenses.map((e) => {
  const shares = calculateEqualSplits(e.amount, e.among);
  return {
    paid_by: e.payer,
    paid_by_pending: null,
    participants: e.among.map((id) => ({ user_id: id, pending_member_id: null, share_amount: shares[id] })),
  };
});

export const demoBalances = calculateGroupBalances(expenses, people);
export const demoDirect = directDebts(expenses, people);
export const demoSmart = smartSettle(demoBalances);
export const demoTotal = demoExpenses.reduce((s, e) => s + e.amount, 0);
