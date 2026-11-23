import ArticleShell, { articleMetadata, type Faq } from '@/components/marketing/ArticleShell';

const path = '/guides/pay-friends-back-abroad';
export const metadata = articleMetadata(path);

const faq: Faq[] = [
  {
    q: 'Can TripSplit send the money for us?',
    a: 'No, and that’s deliberate. TripSplit never holds or moves money. It shows who pays whom, and opens each person’s chosen app (UPI, PayPal, Revolut and so on) with the amount filled in where that app allows it.',
  },
  {
    q: 'Which payment methods can I add?',
    a: 'UPI, PayPal, Cash App, Venmo, Revolut, Monzo, Wise, Bitcoin (on-chain or Lightning), USDT on Tron or Ethereum, ETH, or any https payment link. Add them under Profile → How friends can pay you; you can add up to eight.',
  },
  {
    q: 'Is it safe to share a crypto address?',
    a: 'An address is meant to be shared, but anyone with it can see payments made to it on the blockchain. For extra privacy, use a fresh address for each trip. Always check the network (for example TRC-20 vs ERC-20 for USDT) before sending.',
  },
];

const methods: [string, string, string][] = [
  ['UPI', 'India', 'Instant and free in rupees. Opens GPay, PhonePe or Paytm with the amount filled in.'],
  ['PayPal', 'Worldwide', 'Works almost everywhere; a PayPal.me link can carry the amount and currency. Check fees for cross-border payments.'],
  ['Revolut / Wise', 'Europe, UK and beyond', 'Good when friends hold different currencies. Share your Revtag or Wisetag.'],
  ['Venmo / Cash App', 'US (Cash App also UK)', 'The default for US friends. Domestic only.'],
  ['Monzo', 'UK', 'monzo.me links can carry the amount in pounds.'],
  ['Crypto', 'Anywhere', 'Bitcoin, Lightning or USDT for friends without a shared bank system. Double-check the network before sending.'],
];

export default function Page() {
  return (
    <ArticleShell
      path={path}
      faq={faq}
      answer={
        <>
          <strong>Short answer:</strong> settle in one trip currency, and let each person choose how they want to be paid, whether that’s UPI,
          PayPal, Revolut, Wise, Venmo or crypto. The person paying uses whichever of those they also have.
        </>
      }
    >
      <p>
        Group trips are more international than ever: a bachelor party with friends flying in from Dubai and London, a ski week where half the
        group lives in the US. Working out who owes what is the easy part. Actually moving the money is where it stalls.
      </p>

      <h2>Pick one currency for the trip</h2>
      <p>
        Log every expense in the same currency, using what your card actually charged. Then every balance is in that currency, and each person
        converts once, when they pay. TripSplit lets each trip use its own currency symbol and leaves the exchange rate to you.
      </p>

      <h2>The common ways to pay a friend back</h2>
      <ul>
        {methods.map(([name, where, note]) => (
          <li key={name}><strong>{name}</strong> ({where}): {note}</li>
        ))}
      </ul>

      <h2>Let the person being paid choose</h2>
      <p>
        In TripSplit, everyone adds the ways they can be paid in their profile. When you owe someone, you see a button for each of their methods:
        “Pay via PayPal” opens PayPal with the amount ready, and crypto shows a copy button with the network named. Once paid, tap “Mark paid”
        and everyone’s balance updates.
      </p>
    </ArticleShell>
  );
}
