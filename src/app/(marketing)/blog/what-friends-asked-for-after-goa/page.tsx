import Link from 'next/link';
import ArticleShell, { articleMetadata, type Faq } from '@/components/marketing/ArticleShell';
import { REPO_URL } from '@/lib/marketing/site';

const path = '/blog/what-friends-asked-for-after-goa';
export const metadata = articleMetadata(path);

const faq: Faq[] = [
  {
    q: 'One friend paid the restaurant bill by card and everyone paid them back on the spot. Do I need to add it?',
    a: 'No, nobody owes anything for it. If you want it in the trip total and stats, add it and tick “Everyone already paid them back”: it is recorded, and balances stay the same.',
  },
  {
    q: 'I paid a friend back directly for one big bill, not what the settle-up plan said. Is that a problem?',
    a: 'No. Open that expense and tap “Mark paid back” next to your name. The payment is recorded against that bill and the settle-up plan recalculates around it.',
  },
  {
    q: 'Does TripSplit work without internet?',
    a: 'Yes. Expenses and payments you add offline are saved on your phone and sync automatically when you are back online.',
  },
  {
    q: 'Can I use TripSplit in Hindi?',
    a: 'Yes. Open Settings, then Language, and choose हिन्दी.',
  },
];

export default function Page() {
  return (
    <ArticleShell
      path={path}
      faq={faq}
      answer={
        <>
          <strong>The short version:</strong> after ten of us used TripSplit in Goa, the feedback was clear. It had to match how Indian
          friend groups actually pay: someone swipes a card for the big dinner, UPI for everything else, patchy signal, and half the
          group who just want to see what they owe. So that’s what we built next.
        </>
      }
    >
      <h2>“Someone swiped their card and we paid them back right there”</h2>
      <p>
        The fancy dinner is the classic case. One person pays by credit card (for the points), and everyone sends their share on UPI
        before the bill even leaves the table. Nobody owes anything, so most groups never add it. But then the trip total looks
        wrong, and the stats miss the biggest night out.
      </p>
      <p>
        Now you can add it and tick <strong>Everyone already paid them back</strong>. The expense counts in the trip total and stats,
        each person’s payback is recorded with it, and balances don’t move. Delete the expense and its paybacks go with it.
      </p>

      <h2>“I already paid Rahul for the dinner”</h2>
      <p>
        The other real-life habit: people remember the one big bill they owe and pay that person directly, whatever the settle-up
        plan says. That’s fine. Open the expense and tap <strong>Mark paid back</strong> next to your name. It’s recorded against
        that bill, the expense shows ✓ paid back, and the plan for everyone else recalculates around it.
      </p>

      <h2>Pay back the people who paid for you</h2>
      <p>
        The <Link href="/guides/settle-group-debts-fewest-payments">fewest payments</Link> sounds best on paper, but our friends kept
        asking why they owed someone who never paid for them. So by default, everyone only pays people who actually covered them,
        and debts that go round in a circle (you owe Rahul, Rahul owes Priya, Priya owes you) cancel out, so there are still fewer
        payments. Trip admins can pick “exactly by person” or “fewest payments” instead, in Group settings.
      </p>

      <h2>Simple for most people, powerful for the organiser</h2>
      <p>
        Most people on a trip only want two things: add a bill, and see what they owe. So that’s all they see. Itemized bills,
        percentage splits, stats, the activity log and manual payments sit behind <strong>Advanced features</strong> in Settings.
        Trip admins get them on by default. The maths is the same for everyone either way.
      </p>

      <h2>Built for India</h2>
      <ul>
        <li><strong>UPI first:</strong> each person’s UPI ID sits next to the payment, with a QR to scan and one-tap pay links.</li>
        <li><strong>Hindi:</strong> the whole app in हिन्दी, from Settings.</li>
        <li><strong>Works offline:</strong> no signal on the beach or the hill road? Add expenses anyway. They sync when you’re back.</li>
        <li><strong>WhatsApp:</strong> share or copy the settle-up plan, with UPI IDs, straight into the group chat.</li>
      </ul>

      <h2>Trust the maths</h2>
      <p>
        When it’s everyone’s money, someone always wants to check. <strong>Check the maths</strong> makes a PDF statement with
        every expense, every payment and how each balance was worked out, in light or dark. Friends without an account can see
        their balance from a link, no sign-in needed.
      </p>

      <h2>And the small things</h2>
      <p>
        Dark mode that follows your phone, pull down to refresh, a nudge when you come back from your UPI app asking whether you
        paid, and an app that opens instantly with what you saw last. All of it is free, with no daily limit, and open source on{' '}
        <a href={REPO_URL}>GitHub</a>.
      </p>
      <p>
        Got a trip coming up? <Link href="/register">Start a group</Link> and drop the link in WhatsApp. And if something feels
        off, <Link href="/feedback">tell us</Link>: most of this post came from that form.
      </p>
      <p>— Ashvin</p>
    </ArticleShell>
  );
}
