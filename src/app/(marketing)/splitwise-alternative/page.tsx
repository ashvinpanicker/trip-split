import type { Metadata } from 'next';
import Link from 'next/link';
import { REPO_URL, SITE_URL, jsonLd } from '@/lib/marketing/site';
import { demoDirect, demoSmart } from '@/lib/marketing/demo';

const title = 'Free Splitwise alternative with no daily limit (2026)';
const description =
  'Hit Splitwise’s daily limit? TripSplit is a free, open-source alternative with unlimited expenses, no ads and smart settle-up. How it compares and how to switch.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/splitwise-alternative' },
  openGraph: { title, description, url: '/splitwise-alternative', type: 'article', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'TripSplit: split the trip, not the friendship' }] },
};

export default function SplitwiseAlternative() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    dateModified: '2026-11-20',
    mainEntityOfPage: `${SITE_URL}/splitwise-alternative`,
    author: { '@type': 'Organization', name: 'TripSplit', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'TripSplit', url: SITE_URL },
    image: `${SITE_URL}/og.png`,
  };

  return (
    <article className="wrap pt-8 sm:pt-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <div className="prose">
        <h1 className="text-[2.3rem] sm:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-[var(--ink)]">
          A free Splitwise alternative with no daily limit
        </h1>
        <p className="!text-xl !mt-6">
          <strong>Short answer:</strong> TripSplit is a free, open-source app for splitting group expenses. It does the
          job Splitwise’s free plan used to do (groups, splits, who-owes-whom, simplified settle-up) without capping
          how many expenses you add per day, and without ads.
        </p>

        <h2>Why people are looking for a Splitwise alternative</h2>
        <p>
          Splitwise built the category and is still a solid product. But its free plan has changed. According to its
          app store listing and many user reviews, free accounts can now only add a few expenses per day (commonly
          reported as three to five), see ads and wait timers between entries, and need Splitwise Pro (about $40 a year)
          for features like currency conversion and receipt scanning. Splitwise doesn’t publish the exact limit.
        </p>
        <p>
          A few expenses a day is fine for a flat that logs rent and groceries. It falls apart on a trip, where ten
          friends can rack up twenty expenses before lunch: scooters, breakfast, fuel, entry tickets, the beach shack.
        </p>

        <h2>What TripSplit does</h2>
        <ul>
          <li><strong>Unlimited expenses.</strong> No daily cap, no counters, no timers.</li>
          <li><strong>Equal, percentage or exact splits.</strong> A split can’t be saved unless it adds up to the total, to the paisa.</li>
          <li><strong>Smart settle-up.</strong> Finds the fewest payments that clear every balance. In our example Goa trip, that’s {demoSmart.length} payments instead of {demoDirect.length}.</li>
          <li><strong>Friends join from one link.</strong> Add people by name, share one link in WhatsApp, and each person taps their name to claim their expenses.</li>
          <li><strong>Pay buttons for any app.</strong> UPI, PayPal, Revolut, Wise, Venmo, Cash App, Monzo or crypto, with the amount filled in where the app allows. TripSplit never touches the money.</li>
          <li><strong>Itemized bills, receipt photos and trip stats.</strong> Splitwise keeps these behind Pro. Here they’re free.</li>
          <li><strong>No install.</strong> Runs in any phone browser and can be added to the home screen.</li>
          <li><strong>Open source.</strong> MIT-licensed, with the money maths covered by automated tests. <a href={REPO_URL}>See the code</a>.</li>
        </ul>

        <h2>What TripSplit doesn’t do (yet)</h2>
        <p>
          We’d rather you know up front. TripSplit doesn’t convert between currencies (each trip picks one symbol),
          doesn’t read receipts automatically, and can’t import your Splitwise history. If you need several currencies
          on one trip today, Splitwise Pro or Tricount may suit you better.
        </p>

        <h2>How to switch from Splitwise in five minutes</h2>
        <ol>
          <li>Settle up your open Splitwise group, or note each person’s final balance.</li>
          <li><Link href="/register">Create a free TripSplit account</Link> and a group for your next trip.</li>
          <li>Add your friends by name, then share the group link in your WhatsApp group.</li>
          <li>If balances are carried over, add one expense per person with an exact split to recreate them.</li>
          <li>Log new expenses as they happen. Settle up at the end in the fewest payments.</li>
        </ol>

        <h2>Is it really free?</h2>
        <p>
          Yes. There’s no paid tier to upgrade to and nothing is held back. TripSplit is an open-source project that runs on
          low-cost hosting. If it ever stopped being free, the code is public and anyone could run their own copy.
        </p>

        <div className="not-prose mt-10 flex flex-wrap gap-3">
          <Link href="/register" className="btn btn-primary">Start a group, free</Link>
          <Link href="/how-to-split-trip-expenses" className="btn btn-quiet">Read the trip-splitting guide</Link>
        </div>
      </div>
    </article>
  );
}
