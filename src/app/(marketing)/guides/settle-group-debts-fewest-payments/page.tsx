import ArticleShell, { articleMetadata, type Faq } from '@/components/marketing/ArticleShell';
import { demoBalances, demoDirect, demoSmart } from '@/lib/marketing/demo';
import { formatCurrency } from '@/lib/utils/balance';

const path = '/guides/settle-group-debts-fewest-payments';
export const metadata = articleMetadata(path);

const inr = (n: number) => formatCurrency(n, 'INR').replace('.00', '');

const faq: Faq[] = [
  {
    q: 'What is the most payments a group can need?',
    a: 'One fewer than the number of people with a balance. Ten friends who all owe or are owed something never need more than nine payments, and often need fewer when some balances cancel out.',
  },
  {
    q: 'Is simplifying debts fair?',
    a: 'Everyone pays or receives exactly the same total either way; only the routing changes. The catch is that you might pay someone you didn’t owe directly, which can feel odd. That’s why every TripSplit payment explains itself from each person’s overall total, so nobody has to re-check the maths.',
  },
  {
    q: 'How does TripSplit find the minimum?',
    a: 'It looks for the largest number of separate sub-groups whose balances add up to zero. Each sub-group can settle on its own, so fewer payments are needed. TripSplit does this exactly for up to 14 people with a balance, and very close to it beyond that.',
  },
];

export default function Page() {
  const people = demoBalances.filter((b) => Math.abs(b.net_balance) > 0.005).length;
  return (
    <ArticleShell
      path={path}
      faq={faq}
      answer={
        <>
          <strong>Short answer:</strong> work out each person’s net balance (what they paid minus their share), then match people who owe with
          people who are owed. A group never needs more payments than one fewer than the number of people with a balance.
        </>
      }
    >
      <h2>Step 1: everyone’s net balance</h2>
      <p>
        Forget individual expenses for a moment. For each person, add up what they paid and subtract their share of everything. Positive means
        the group owes them; negative means they owe the group. Here’s a six-person Goa weekend:
      </p>
      <ul>
        {demoBalances.map((b) => (
          <li key={b.person_id}>
            <strong>{b.user_name}:</strong> {b.net_balance >= 0 ? 'is owed' : 'owes'} {inr(Math.abs(b.net_balance))}
          </li>
        ))}
      </ul>
      <p>The balances always add up to zero: every rupee someone is owed, someone else owes.</p>

      <h2>Step 2: pay back directly, or simplify</h2>
      <p>
        <strong>Paying back exactly who paid for you</strong> takes {demoDirect.length} payments in this example. It’s easy to understand
        (“Rohan pays Aarav for the villa”) but it’s a lot of transfers.
      </p>
      <p>
        <strong>Simplifying</strong> nets everything first, then settles with the fewest transfers. Same money, {demoSmart.length} payments:
      </p>
      <ul>
        {demoSmart.map((s) => (
          <li key={`${s.from_id}-${s.to_id}`}>{s.from_name} pays {s.to_name} {inr(s.amount)}</li>
        ))}
      </ul>
      <p>
        With {people} people holding a balance, the most you could ever need is {people - 1}. Groups often need fewer, because some people’s
        balances cancel each other out.
      </p>

      <h2>Which should your group use?</h2>
      <ul>
        <li><strong>Pay back directly</strong> when people want to see exactly what each payment is for, or the group isn’t close.</li>
        <li><strong>Simplify</strong> for big groups and long trips, where the saving in transfers is large.</li>
      </ul>
      <p>
        TripSplit uses the fewest payments by default, and each payment says why (“you’re ₹2,000 short overall, Rahul paid ₹12,000 more than his share”). The group admin can switch to paying back each person instead.
        Either way, each payment opens your payment app with the amount filled in.
      </p>
    </ArticleShell>
  );
}
