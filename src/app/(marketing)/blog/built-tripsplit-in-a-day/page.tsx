import Link from 'next/link';
import ArticleShell, { articleMetadata } from '@/components/marketing/ArticleShell';
import { REPO_URL } from '@/lib/marketing/site';

const path = '/blog/built-tripsplit-in-a-day';
export const metadata = articleMetadata(path);

export default function Page() {
  return (
    <ArticleShell
      path={path}
      answer={
        <>
          <strong>The short version:</strong> ten of us were in Goa for a bachelor party, Splitwise’s free plan kept capping our expenses, and
          my old side project had gone offline. So in one day, mid-trip, I rebuilt it with Claude into the free, open-source app you’re reading about.
        </>
      }
    >
      <h2>The problem</h2>
      <p>
        Group trips generate a ridiculous number of small expenses. Scooters, breakfast, fuel, water, the beach shack, the late-night run.
        We started on Splitwise like everyone does, and hit the free plan’s daily limit almost immediately. Waiting out ads to add a ₹600 water
        bill is not how anyone wants to spend a holiday.
      </p>
      <p>
        I’d built a small trip-splitting app for an earlier trip to Kodaikanal. It worked, but it lived on a free hosting plan that had since
        gone away, and it was built for six people who all signed up on day one. This trip had ten guys, half of whom were never going to create an account.
      </p>

      <h2>What “vibecoding” it actually looked like</h2>
      <p>
        I paired with Claude for the day: I described what the group needed in plain language, from my phone and laptop between beach and dinner,
        and Claude wrote the code, ran the tests, deployed it and checked it in my browser. My job was product: deciding what mattered, and
        pushing back when something felt wrong.
      </p>
      <p>In roughly the order the group asked for them, that day added:</p>
      <ul>
        <li><strong>A new home:</strong> moved to Cloudflare so it runs fast and free.</li>
        <li><strong>One invite link:</strong> add friends by name, drop one link in WhatsApp, each person taps their name.</li>
        <li><strong>Maths you can trust:</strong> everything in whole paise, a split can’t save unless it adds up exactly, and a test suite that checks the settle-up plan against a brute-force answer.</li>
        <li><strong>Smart settle-up:</strong> the fewest payments, but pay-back-who-paid-for-you by default, because people trust that more.</li>
        <li><strong>Trust features:</strong> group admins, a full activity log of every add, edit and delete, and a breakdown behind every payment.</li>
        <li><strong>The fun stuff:</strong> itemized bills, receipt photos, trip stats with charts, and awards like Chief Beer Officer.</li>
        <li><strong>Worldwide:</strong> any currency symbol per trip, and pay buttons for UPI, PayPal, Revolut, Wise, Venmo, Cash App and crypto.</li>
        <li><strong>Offline mode</strong> for when Goa’s signal gives up.</li>
      </ul>

      <h2>What went wrong</h2>
      <p>
        Not everything was smooth. A database change briefly broke adding expenses, live, while the group was using it. It got fixed fast,
        and it’s why every money-related change now ships with tests that run before each deploy. The bigger lesson was trust: when it’s
        everyone’s money, people want to see exactly where each number came from. That pushed us to build the trust features above, not more charts.
      </p>

      <h2>Why it’s free and open source</h2>
      <p>
        Splitting a bill shouldn’t need a subscription. The app costs very little to run, the code is public on{' '}
        <a href={REPO_URL}>GitHub</a> under the MIT licence, and if it ever stopped being free, anyone could host their own copy. If it saves
        your group an argument, the tip links in the footer help pay for the domain.
      </p>

      <h2>Try it on your holiday trip</h2>
      <p>
        If you’re travelling with friends this season, <Link href="/register">start a group</Link>, or read{' '}
        <Link href="/guides/split-holiday-trip-expenses">how to split holiday trip costs</Link> first. And if you build something with it, I’d love to hear.
      </p>
      <p>— Ashvin</p>
    </ArticleShell>
  );
}
