import type { Metadata } from 'next';
import Link from 'next/link';
import LedgerDemo from '@/components/marketing/LedgerDemo';
import { faq } from '@/lib/marketing/faq';
import { REPO_URL, SITE_URL, jsonLd } from '@/lib/marketing/site';

export const metadata: Metadata = {
  title: { absolute: 'TripSplit — Free Splitwise alternative with no daily limit' },
  description:
    'Split trip and group expenses with friends for free. No daily expense limit, no ads, no Pro plan. Smart settle-up, UPI pay, works in any phone browser. Open source.',
  alternates: { canonical: '/' },
};

const steps = [
  { title: 'Create a group', body: 'One group per trip, flat or event. Give it a name like “Goa 2026”.' },
  { title: 'Add friends by name', body: 'Type everyone’s names in one go. They don’t need an account yet.' },
  { title: 'Drop one link in WhatsApp', body: 'Friends open it, tap their name and they’re in, along with everything already logged for them.' },
  { title: 'Log expenses as you go', body: 'Whoever pays adds it: equal, percentage or exact split, any number per day.' },
  { title: 'Settle up in a few payments', body: 'TripSplit shows the fewest payments that clear everyone, with one-tap UPI.' },
];

const compare: [string, string, string][] = [
  ['Price', 'Free', 'Free plan; Pro about $40/year'],
  ['Expenses per day', 'Unlimited', 'Capped on the free plan (reported as 3–5)'],
  ['Ads or wait timers', 'None', 'Yes, on the free plan'],
  ['Fewest-payments settle-up', 'Yes, exact minimum', 'Yes'],
  ['Friends without an account', 'Yes, they claim their name later', 'Yes'],
  ['Open source', 'Yes, MIT licence', 'No'],
  ['Multiple currencies', 'Not yet (₹ only)', 'Conversion is a Pro feature'],
  ['Receipt scanning', 'No', 'Pro feature'],
];

export default function Home() {
  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'TripSplit',
      url: SITE_URL,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      description: 'Free, open-source app to split trip and group expenses with friends. No daily expense limit, no ads.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      isAccessibleForFree: true,
      license: 'https://opensource.org/licenses/MIT',
      codeRepository: REPO_URL,
      featureList: [
        'Unlimited expenses, no daily cap',
        'Equal, percentage and exact splits',
        'Smart settle-up with the fewest payments',
        'Add friends before they sign up',
        'One-tap UPI payments',
        'Works in any phone browser',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />

      {/* Hero */}
      <section className="wrap grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center pt-8 pb-16 sm:pt-16 sm:pb-24">
        <div>
          <h1 className="text-[2.6rem] leading-[1.03] sm:text-6xl font-extrabold tracking-[-0.035em] [font-stretch:92%]">
            Split the trip, not the friendship. Free, with no daily limit.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[var(--ink-soft)] max-w-[34rem]">
            TripSplit is a free, open-source Splitwise alternative. Log every expense on the trip, as many as you like,
            and settle up in the fewest payments. No ads, no Pro plan, nothing to install.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary">Start a group, free</Link>
            <Link href="/splitwise-alternative" className="btn btn-quiet">Compare with Splitwise</Link>
          </div>
          <p className="mt-5 text-sm text-[var(--ink-soft)]">
            Works in any phone browser. Your friends join from one WhatsApp link.
          </p>
        </div>
        <LedgerDemo />
      </section>

      {/* Why it's free */}
      <section className="bg-white border-y border-[var(--rule)]">
        <div className="wrap py-16 grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            Free because it’s open source, not because you’re the product.
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 text-[1.02rem]">
            <div>
              <p className="font-semibold">No daily cap</p>
              <p className="text-[var(--ink-soft)] mt-1">Add the 40th expense of the day as easily as the first. No counters, no timers.</p>
            </div>
            <div>
              <p className="font-semibold">No ads, no upsell</p>
              <p className="text-[var(--ink-soft)] mt-1">There’s no premium tier to push you into. Every feature is for everyone.</p>
            </div>
            <div>
              <p className="font-semibold">Code you can read</p>
              <p className="text-[var(--ink-soft)] mt-1">
                MIT-licensed on <a className="underline underline-offset-4 decoration-[var(--rule)] hover:decoration-[var(--blue)]" href={REPO_URL} rel="noopener">GitHub</a>, with the money maths covered by tests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works: a real sequence, so it's numbered */}
      <section className="wrap py-20" aria-labelledby="how">
        <h2 id="how" className="text-3xl sm:text-4xl font-bold tracking-tight">How to split a trip with TripSplit</h2>
        <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.title} className="relative pt-12">
              <span aria-hidden className="absolute top-0 left-0 num text-[2.6rem] leading-none font-extrabold text-[var(--rule)] [-webkit-text-stroke:1.5px_var(--blue)]">
                {i + 1}
              </span>
              <p className="font-semibold text-[1.05rem]">{s.title}</p>
              <p className="text-[var(--ink-soft)] mt-1.5">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Comparison */}
      <section className="wrap pb-20" aria-labelledby="compare">
        <h2 id="compare" className="text-3xl sm:text-4xl font-bold tracking-tight">TripSplit vs Splitwise’s free plan</h2>
        <p className="mt-3 text-[var(--ink-soft)] max-w-2xl">
          Splitwise is a good product. Its free plan just isn’t built for a busy trip anymore. Here’s the honest picture, including what we don’t do yet.
        </p>
        <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--rule)] bg-white">
          <table className="w-full text-left text-[0.95rem]">
            <caption className="sr-only">Feature comparison between TripSplit and Splitwise free plan</caption>
            <thead>
              <tr className="border-b border-[var(--rule)]">
                <th scope="col" className="p-3 sm:p-4 font-medium text-[var(--ink-soft)] w-[34%]"><span className="sr-only">Feature</span></th>
                <th scope="col" className="p-3 sm:p-4 font-bold text-[var(--blue)]">TripSplit</th>
                <th scope="col" className="p-3 sm:p-4 font-bold">Splitwise (free)</th>
              </tr>
            </thead>
            <tbody>
              {compare.map(([k, a, b]) => (
                <tr key={k} className="border-b border-[var(--rule)] last:border-0 align-top">
                  <th scope="row" className="p-3 sm:p-4 font-medium">{k}</th>
                  <td className="p-3 sm:p-4">{a}</td>
                  <td className="p-3 sm:p-4 text-[var(--ink-soft)]">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--ink-soft)]">
          Splitwise details are from its app store listing and public user reports as of November 2026; Splitwise doesn’t publish its exact free-plan limit. Check splitwise.com for current terms.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white border-y border-[var(--rule)] scroll-mt-4" aria-labelledby="faq-h">
        <div className="wrap py-20 grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <h2 id="faq-h" className="text-3xl sm:text-4xl font-bold tracking-tight">Questions people ask</h2>
          <div className="divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
            {faq.map((f, i) => (
              <details key={f.q} className="group py-4" open={i === 0}>
                <summary className="flex items-start justify-between gap-4 font-semibold text-[1.05rem]">
                  <h3>{f.q}</h3>
                  <span aria-hidden className="chev mt-1 text-[var(--blue)] text-xl leading-none transition-transform">+</span>
                </summary>
                <p className="mt-2 text-[var(--ink-soft)] max-w-[40rem]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="wrap pt-20 text-center">
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] max-w-3xl mx-auto leading-tight">
          Your next trip, minus the spreadsheet.
        </h2>
        <p className="mt-4 text-lg text-[var(--ink-soft)]">Set up a group in a minute. It stays free.</p>
        <Link href="/register" className="btn btn-primary mt-8">Start a group, free</Link>
      </section>
    </>
  );
}
