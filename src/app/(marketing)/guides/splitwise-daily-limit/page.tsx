import Link from 'next/link';
import ArticleShell, { articleMetadata, type Faq } from '@/components/marketing/ArticleShell';

const path = '/guides/splitwise-daily-limit';
export const metadata = articleMetadata(path);

const faq: Faq[] = [
  {
    q: 'How many expenses can you add per day on Splitwise’s free plan?',
    a: 'Splitwise doesn’t publish the number. Users and reviewers report a cap of roughly two to five new expenses a day, varying by region, plus a short ad or wait before adding an expense. Check Splitwise’s own app for your current limit.',
  },
  {
    q: 'Does the daily limit apply to the whole group?',
    a: 'Reports describe it as a per-account limit on adding expenses, so a group can spread entries across members. On a busy trip that means a lot of “can you add this one?” messages.',
  },
  {
    q: 'What does Splitwise Pro cost?',
    a: 'Pricing varies by country and has changed over time; recent reports put it around $40 to $50 a year. Pro removes the daily limit and ads and adds features such as currency conversion, receipt scanning, search and charts.',
  },
  {
    q: 'Is there a free alternative with no daily limit?',
    a: 'Yes. TripSplit is free and open source with no daily limit and no ads, and includes search, charts, itemized bills and receipt photos at no cost. Tricount and other apps are also free options.',
  },
];

export default function Page() {
  return (
    <ArticleShell
      path={path}
      faq={faq}
      answer={
        <>
          <strong>Short answer:</strong> Splitwise’s free plan now caps how many expenses you can add each day (reported as two to five,
          depending on region) and shows ads between entries. Fine for rent; painful on a trip. Pay for Pro, or switch to a free app with no cap.
        </>
      }
    >
      <h2>What changed</h2>
      <p>
        Splitwise built this category and is still a solid product. But over the last few years its free plan has added a daily cap on new
        expenses, ads and wait timers, and moved features like search, charts, itemizing and currency conversion to the paid Pro plan.
        Splitwise doesn’t publish the exact cap, so the numbers you’ll see online vary.
      </p>

      <h2>Why it hurts most on trips</h2>
      <p>
        A flat logs a handful of bills a month. A group trip logs that before lunch: scooters, breakfast, fuel, tickets, the beach shack. With a
        cap of a few a day, someone ends up keeping a note on their phone and entering it all later, which is exactly what the app was meant to avoid.
      </p>

      <h2>Your options</h2>
      <ul>
        <li><strong>Pay for Splitwise Pro</strong> if your group is happy there and uses it all year.</li>
        <li><strong>Spread entries across the group</strong> to stay under the cap. It works, but it’s fiddly.</li>
        <li>
          <strong>Use a free app without a cap.</strong> <Link href="/">TripSplit</Link> is free, open source and has no daily limit. See the{' '}
          <Link href="/splitwise-alternative">full comparison</Link>.
        </li>
      </ul>

      <h2>Moving a group over</h2>
      <ol>
        <li>Settle your open Splitwise group, or note each person’s final balance.</li>
        <li>Create a TripSplit group and add everyone by name.</li>
        <li>Add one expense per person for their carried-over balance, if any.</li>
        <li>Share the invite link in your group chat.</li>
      </ol>
    </ArticleShell>
  );
}
