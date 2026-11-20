import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, jsonLd } from '@/lib/marketing/site';
import { demoBalances, demoDirect, demoExpenses, demoSmart, demoTotal } from '@/lib/marketing/demo';
import { formatCurrency } from '@/lib/utils/balance';

const inr = (n: number) => formatCurrency(n).replace('.00', '');
const title = 'How to split trip expenses with friends, fairly and without the maths';
const description =
  'A practical guide to splitting group trip costs: who pays, how to handle uneven shares, and how to settle up in the fewest payments. With a worked Goa example.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/how-to-split-trip-expenses' },
  openGraph: { title, description, url: '/how-to-split-trip-expenses', type: 'article' },
};

const steps = [
  ['Agree the rules before you leave', 'Decide what’s shared (stay, transport, group meals) and what isn’t (souvenirs, a solo spa day). One message in the group chat saves arguments later.'],
  ['Make one shared list', 'Create a TripSplit group and add everyone by name. Share the group link so each person can log what they pay.'],
  ['Log each expense when it happens', 'Record who paid, the amount, and who it was for. Leave out the person who skipped the parasailing.'],
  ['Use the right split', 'Equal for most things. Percentage or exact amounts for uneven rooms, or for couples paying as one.'],
  ['Settle up at the end, in as few payments as possible', 'Net everyone’s balance, then pay along the shortest plan. TripSplit works this out and opens UPI for each payment.'],
];

export default function Guide() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description,
    url: `${SITE_URL}/how-to-split-trip-expenses`,
    step: steps.map(([name, text], i) => ({ '@type': 'HowToStep', position: i + 1, name, text })),
  };

  return (
    <article className="wrap pt-8 sm:pt-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <div className="prose">
        <h1 className="text-[2.3rem] sm:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-[var(--ink)]">
          How to split trip expenses with friends
        </h1>
        <p className="!text-xl !mt-6">
          <strong>Short answer:</strong> keep one shared list of who paid what and who it was for, work out each
          person’s net balance at the end, then settle with the fewest possible payments. A free app like TripSplit
          does all three for you.
        </p>

        <h2>The five steps</h2>
        <ol>
          {steps.map(([name, text]) => (
            <li key={name}><strong>{name}.</strong> {text}</li>
          ))}
        </ol>

        <h2>A worked example: a Goa weekend</h2>
        <p>
          Six friends, {demoExpenses.length} expenses, {inr(demoTotal)} in total. Not everyone joined everything: only three went parasailing, and
          only two did the flea market.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 max-w-5xl">
        <div className="overflow-hidden rounded-2xl border border-[var(--rule)] bg-white">
          <table className="w-full text-left text-[0.95rem]">
            <caption className="text-left p-4 pb-2 font-semibold">What was spent</caption>
            <thead><tr className="border-b border-[var(--rule)] text-[var(--ink-soft)]"><th scope="col" className="px-4 py-2 font-medium">Expense</th><th scope="col" className="px-4 py-2 font-medium">Paid by</th><th scope="col" className="px-4 py-2 font-medium text-right">Amount</th></tr></thead>
            <tbody>
              {demoExpenses.map((e) => (
                <tr key={e.title} className="border-b border-[var(--rule)] last:border-0">
                  <td className="px-4 py-2">{e.title}<span className="block text-xs text-[var(--ink-soft)]">{e.among.length === 6 ? 'everyone' : e.among.join(', ')}</span></td>
                  <td className="px-4 py-2">{e.payer}</td>
                  <td className="px-4 py-2 text-right num">{inr(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--rule)] bg-white">
          <table className="w-full text-left text-[0.95rem]">
            <caption className="text-left p-4 pb-2 font-semibold">Where everyone ends up</caption>
            <thead><tr className="border-b border-[var(--rule)] text-[var(--ink-soft)]"><th scope="col" className="px-4 py-2 font-medium">Person</th><th scope="col" className="px-4 py-2 font-medium text-right">Balance</th></tr></thead>
            <tbody>
              {demoBalances.map((b) => (
                <tr key={b.person_id} className="border-b border-[var(--rule)] last:border-0">
                  <td className="px-4 py-2">{b.user_name}</td>
                  <td className={`px-4 py-2 text-right num font-medium ${b.net_balance > 0 ? 'text-[var(--gain)]' : 'text-[var(--margin)]'}`}>
                    {b.net_balance > 0 ? `gets back ${inr(b.net_balance)}` : `owes ${inr(-b.net_balance)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="prose">
        <h2>Settling up: {demoDirect.length} payments, or {demoSmart.length}?</h2>
        <p>
          If everyone pays back exactly the people who paid for them, this trip needs {demoDirect.length} separate payments.
          Because only balances matter, the same result takes just {demoSmart.length}:
        </p>
        <ul>
          {demoSmart.map((s) => (
            <li key={s.from_id + s.to_id}>{s.from_name} pays {s.to_name} <strong className="num">{inr(s.amount)}</strong></li>
          ))}
        </ul>
        <p>
          TripSplit calls this smart settle. It finds the true minimum number of payments, including spotting
          people whose balances cancel each other out, and all maths runs in whole paise so nothing is lost to rounding.
        </p>

        <h2>Common questions</h2>
        <h3>Should the person who booked the stay pay more?</h3>
        <p>No. Whoever pays upfront is simply owed the money back. Their share is the same as everyone else’s unless you agree otherwise.</p>
        <h3>How do we split a room that costs more?</h3>
        <p>Use an exact-amount split for the stay: put the bigger room’s price against the people in it. Everything else can stay equal.</p>
        <h3>What about a couple paying as one?</h3>
        <p>Either add them as one person in the group, or as two people with the same share. Either way the totals add up.</p>

        <div className="not-prose mt-10 flex flex-wrap gap-3">
          <Link href="/register" className="btn btn-primary">Split your trip, free</Link>
          <Link href="/splitwise-alternative" className="btn btn-quiet">TripSplit vs Splitwise</Link>
        </div>
      </div>
    </article>
  );
}
