import ArticleShell, { articleMetadata, type Faq } from '@/components/marketing/ArticleShell';
import { formatCurrency, itemizedShares } from '@/lib/utils/balance';

const path = '/guides/split-restaurant-bill-by-item';
export const metadata = articleMetadata(path);

// A real calculation, run through the app's own tested code
const items = [
  { name: 'Steak', price: 42, people: ['Sam'] },
  { name: 'Caesar salad', price: 18, people: ['Priya'] },
  { name: 'Pizza to share', price: 24, people: ['Leo', 'Mia'] },
  { name: 'Bottle of wine', price: 54, people: ['Sam', 'Leo', 'Mia'] },
];
const taxAndTip = 27.6; // 20% on a $138 subtotal
const { shares, subtotal, total } = itemizedShares(items, taxAndTip);
const usd = (n: number) => formatCurrency(n, 'USD');
const ordered = (k: string) => items.reduce((s, it) => s + (it.people.includes(k) ? it.price / it.people.length : 0), 0);

const faq: Faq[] = [
  {
    q: 'Is it fair to split tax and tip equally?',
    a: 'Not really. Someone who had a salad shouldn’t pay the same tip as someone who had steak and wine. Spread tax, service and tip in proportion to what each person ordered; that’s what a percentage tip is anyway.',
  },
  {
    q: 'What about a shared starter or bottle?',
    a: 'Split the item only among the people who had it. A pizza shared by two counts half to each; a bottle shared by three counts a third to each.',
  },
  {
    q: 'Do the shares always add up exactly?',
    a: 'They should. TripSplit works in whole cents (or paise) and hands out any leftover cent one at a time, so the shares always add up to the bill exactly.',
  },
];

export default function Page() {
  return (
    <ArticleShell
      path={path}
      faq={faq}
      answer={
        <>
          <strong>Short answer:</strong> add up what each person ordered (shared items split among the people who had them), then spread tax,
          service and tip in proportion to each person’s subtotal. Splitting the whole bill evenly overcharges whoever ordered least.
        </>
      }
    >
      <h2>A worked example</h2>
      <p>Four friends, one bill. Everyone ordered something different, and the bill adds 20% for tax and tip.</p>
      <ul>
        {items.map((it) => (
          <li key={it.name}>{it.name}: {usd(it.price)} · {it.people.join(', ')}</li>
        ))}
        <li>Tax and tip: {usd(taxAndTip)}</li>
      </ul>
      <p>Subtotal {usd(subtotal)}, total {usd(total)}. Here’s what each person owes:</p>
      <ul>
        {Object.entries(shares).map(([k, v]) => (
          <li key={k}><strong>{k}:</strong> ordered {usd(ordered(k))}, pays <strong>{usd(v)}</strong></li>
        ))}
      </ul>
      <p>
        Split evenly, everyone would have paid {usd(total / 4)}. That’s {usd(total / 4 - (shares.Priya ?? 0))} too much for Priya, who only had a salad.
      </p>

      <h2>How to do it in TripSplit</h2>
      <ol>
        <li>Add an expense and choose <strong>Items</strong> as the split.</li>
        <li>Add each item with its price, and tap who had it.</li>
        <li>Enter tax, service and tip, or tap +5%, +10% or +18%.</li>
        <li>Check the per-person total at the bottom, then save. You can reopen it and edit the items later.</li>
      </ol>
      <p>Splitwise keeps itemizing behind its paid Pro plan. In TripSplit it’s free.</p>
    </ArticleShell>
  );
}
