import Link from 'next/link';
import ArticleShell, { articleMetadata, type Faq } from '@/components/marketing/ArticleShell';
import { REPO_URL } from '@/lib/marketing/site';

const path = '/compare';
export const metadata = articleMetadata(path);

const APPS = ['TripSplit', 'Splitwise (free)', 'Settle Up (free)', 'Tricount', 'Splid'] as const;

/** ✓ = yes, a string = what it does instead, '—' = not something we could find in the app's listing or help pages. */
const ROWS: [string, ...string[]][] = [
  ['Price', 'Free, no paid plan', 'Free with ads; Pro is paid', 'Free with ads; Premium is paid', 'Free', 'Free for one group; one-time fee for more'],
  ['Expenses per day', 'Unlimited', 'Capped on the free plan', 'Unlimited', 'Unlimited', 'Unlimited'],
  ['Many currencies, one settle-up', '✓ with today’s rate filled in', 'Conversion is Pro only', '✓', '✓', '✓'],
  ['Pay by UPI with the amount filled in, or scan a QR', '✓', '—', '—', '—', '—'],
  ['Hindi', '✓', 'No', 'Many languages', '—', 'No'],
  ['Friends don’t need an account', '✓ add by name, balance by link', '—', '✓', '—', '✓'],
  ['Works offline', '✓ syncs when back online', '—', '✓', '✓', '✓'],
  ['Receipt photos', '✓', '—', 'Premium', '✓', '—'],
  ['Trip stats and charts', '✓', 'Pro', 'Premium', '✓', '—'],
  ['Split a bill by item, tax shared fairly', '✓', '—', '✓', '—', '—'],
  ['“Check the maths” PDF statement', '✓', '—', '—', '—', '—'],
  ['Spreadsheet export', '✓', '—', '✓', 'Via support', 'Paid'],
  ['Trip admins and an activity log', '✓', 'No admins: anyone can edit or delete', 'Read-only access', '—', '—'],
  ['Fewest payments to settle', '✓', '✓', '✓', '✓', '✓'],
  ['Choose how to settle', '✓ pay back who paid for you, exactly by person, or fewest', 'Simplify on or off', '—', '—', '—'],
  ['Open source', '✓ MIT licence', 'No', 'No', 'No', 'No'],
  ['App store app', 'No: a web app you add to your home screen', '✓', '✓', '✓', '✓'],
  ['Recurring bills (rent)', 'Not yet', '✓', 'Premium', '—', '—'],
  ['Push notifications', 'Not yet: reminders on Home', '✓', '✓', '—', '—'],
];

const faq: Faq[] = [
  { q: 'What is the best free Splitwise alternative in India?', a: 'For group trips, TripSplit: free with no daily limit, UPI pay links and QR codes, Hindi, and friends can join from one WhatsApp link without installing anything.' },
  { q: 'Which split app handles several currencies on one trip?', a: 'TripSplit, Settle Up, Tricount and Splid all do on their free plans. TripSplit converts each expense into the trip currency with the day’s rate filled in, so everyone settles in one currency with one payment each.' },
  { q: 'Is TripSplit really free?', a: 'Yes. There is no paid plan, no ads and no limit. It is open source, so anyone can check the code or run their own copy.' },
];

const mark = (v: string) => (v === '✓' ? <span aria-label="Yes" className="text-green-700 font-bold">✓</span> : v.startsWith('✓ ') ? <><span aria-label="Yes" className="text-green-700 font-bold">✓</span> {v.slice(2)}</> : v);

export default function Page() {
  return (
    <ArticleShell
      path={path}
      faq={faq}
      answer={
        <>
          <strong>The short version:</strong> for group trips from India, TripSplit is the one that’s free with no limits, pays by UPI, speaks
          Hindi, works offline and lets friends join without an account. The others are good apps; they just weren’t built for this.
          Here’s the full picture, including where we’re behind.
        </>
      }
    >
      <h2>Feature by feature</h2>
      <p className="sm:hidden !text-sm">Swipe the table sideways to see the other apps.</p>
      <div className="bleed mt-4 overflow-x-auto rounded-2xl border border-[var(--rule)] bg-white">
        <table className="w-full min-w-[52rem] text-left text-[0.92rem]">
          <caption className="sr-only">TripSplit compared with Splitwise, Settle Up, Tricount and Splid</caption>
          <thead>
            <tr className="border-b border-[var(--rule)]">
              <th scope="col" className="sticky left-0 bg-white p-3 w-[24%]"><span className="sr-only">Feature</span></th>
              {APPS.map((a, i) => (
                <th key={a} scope="col" className={`p-3 font-bold ${i === 0 ? 'text-[var(--blue)] bg-[#eef4ff]' : ''}`}>{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([feature, ...cells]) => (
              <tr key={feature} className="border-b border-[var(--rule)] last:border-0 align-top">
                <th scope="row" className="sticky left-0 bg-white p-3 font-medium text-[var(--ink)]">{feature}</th>
                {cells.map((c, i) => (
                  <td key={i} className={`p-3 ${i === 0 ? 'bg-[#eef4ff] text-[var(--ink)]' : 'text-[var(--ink-soft)]'}`}>{mark(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="!text-xs">
        Checked against each app’s store listing and help pages in November 2026. “—” means we couldn’t find it listed, not that it
        definitely doesn’t exist. Plans change, so check each app for current terms. Something wrong?{' '}
        <Link href="/feedback">Tell us</Link> and we’ll fix it.
      </p>

      <h2>Why TripSplit for an Indian group trip</h2>
      <ul>
        <li><strong>Nobody hits a wall mid-trip.</strong> No daily cap, no ads, no paid tier. Splitwise’s free plan limits how many expenses you add a day, which a busy trip blows through by lunch.</li>
        <li><strong>Paying back is one tap.</strong> Each payment opens your UPI app with the amount filled in, or shows a QR to scan. The person paying taps “I’ve paid” and they’re off the list.</li>
        <li><strong>Friends join from WhatsApp.</strong> Add everyone by name, share one link, each person taps their name. People who never sign up can still see what they owe.</li>
        <li><strong>Simple for most, powerful for the organiser.</strong> Friends see “add a bill, see what I owe”. Item-wise bills, weights for couples, two people paying one bill and the activity log are there when you switch them on.</li>
        <li><strong>Money everyone can check.</strong> A PDF statement shows how every balance was worked out, and admins can see every add, edit and delete.</li>
        <li><strong>Built for how trips really go.</strong> Card swiped at dinner and everyone paid on the spot? Paid one friend back directly? No signal on the beach? All handled.</li>
      </ul>

      <h2>When another app fits better</h2>
      <ul>
        <li><strong>Flatmates with rent every month:</strong> Splitwise and Settle Up have recurring bills; we don’t yet.</li>
        <li><strong>You want an app-store app with push notifications:</strong> TripSplit is a web app you add to your home screen. It opens full screen and works offline, but it can’t send push alerts yet.</li>
        <li><strong>A European group that banks with bunq:</strong> Tricount links to bunq accounts.</li>
      </ul>
      <p>
        Everything else, we’d love you to try. It’s free, and the code is on <a href={REPO_URL}>GitHub</a>.{' '}
        <Link href="/register">Start a group</Link> or read <Link href="/splitwise-alternative">how to move a group over from Splitwise</Link>.
      </p>

      <h2>Sources</h2>
      <ul className="!text-sm">
        <li><a href="https://apps.apple.com/us/app/splitwise/id458023433" rel="noopener">Splitwise on the App Store</a> (free-plan daily limit, Pro)</li>
        <li><a href="https://www.moneycrashers.com/splitwise-review/" rel="noopener">Money Crashers: Splitwise review</a> (Pro-only conversion and search; no group admins)</li>
        <li><a href="https://apps.apple.com/app/id737534985" rel="noopener">Settle Up on the App Store</a> (free and Premium features)</li>
        <li><a href="https://help.tricount.com/articles/what-happened-with-tricount-premium" rel="noopener">Tricount help: what happened with Premium</a> (export and statistics changes)</li>
        <li><a href="https://apple.co/49TjRbI" rel="noopener">Splid on the App Store</a> (one free group, one-time purchases)</li>
      </ul>
    </ArticleShell>
  );
}
