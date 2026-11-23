import Link from 'next/link';
import ArticleShell, { articleMetadata, type Faq } from '@/components/marketing/ArticleShell';

const path = '/guides/split-holiday-trip-expenses';
export const metadata = articleMetadata(path);

const faq: Faq[] = [
  {
    q: 'Should our group use a kitty or log every expense?',
    a: 'A kitty (everyone chips in upfront) works for small, predictable costs like fuel or snacks. For anything uneven, such as rooms, activities only some people join, or drinks, log each expense with who paid and who it was for. Most groups do both: a small kitty plus a shared expense list.',
  },
  {
    q: 'How do we split costs when the trip crosses countries?',
    a: 'Pick one trip currency, usually the one most of the group earns in, and log every expense in it using the rate on your card statement. TripSplit lets each trip use its own currency symbol; it doesn’t convert, so you control the rate.',
  },
  {
    q: 'When should we settle up?',
    a: 'Before everyone flies home. Do a quick check-in halfway through the trip so nobody is fronting a large amount for long, then settle the rest on the last evening while everyone is still in one place.',
  },
  {
    q: 'What if someone skips an activity or leaves early?',
    a: 'Leave them out of that expense. Every expense in TripSplit has its own list of people it was for, so the person who skipped the boat trip never pays for it, and someone who left a day early isn’t charged for the last night’s dinner.',
  },
];

export default function Page() {
  return (
    <ArticleShell
      path={path}
      faq={faq}
      answer={
        <>
          <strong>Short answer:</strong> agree what’s shared before you leave, log each expense as it happens with who paid and who it was for,
          keep the whole trip in one currency, and settle up in the fewest payments before anyone flies home.
        </>
      }
    >
      <p>
        Holiday trips are the hardest kind to split. Prices jump around Christmas and New Year, groups are bigger, people arrive and leave on
        different days, and someone always ends up paying for the villa on their credit card. Here’s a plan that keeps it fair without
        turning you into the group accountant.
      </p>

      <h2>1. Agree the rules in the group chat before you go</h2>
      <p>One message saves a lot of awkwardness later. Cover three things:</p>
      <ul>
        <li><strong>What’s shared:</strong> stay, car or scooters, fuel, group meals. Usually not: souvenirs, solo activities, a spa day.</li>
        <li><strong>Drinks:</strong> split among the people drinking, not the whole table. It’s the most common source of grumbling.</li>
        <li><strong>Big bookings:</strong> who puts the stay and flights on their card, and roughly when they get paid back.</li>
      </ul>

      <h2>2. Set up one shared list everyone can add to</h2>
      <p>
        Create a group for the trip and add everyone by name, even friends who haven’t signed up yet. Then drop one invite link in the group chat;
        each person taps their name and sees everything already logged for them. With <Link href="/">TripSplit</Link> there’s no daily cap,
        so a 20-expense day is fine.
      </p>

      <h2>3. Log expenses when they happen, not at the end</h2>
      <p>
        Whoever pays adds it right then, with the right people ticked. It takes ten seconds at the table and saves an hour of “wait, who paid for
        the cab on Tuesday?” later. For a restaurant where everyone ordered different things, <Link href="/guides/split-restaurant-bill-by-item">split it by item</Link>.
        Snap the receipt if it’s a big one.
      </p>

      <h2>4. Keep the whole trip in one currency</h2>
      <p>
        If the trip crosses borders, or half the group lives abroad, choose one currency for the trip and log everything in it. Use the amount
        your card actually charged, so card fees and exchange rates are shared too. TripSplit trips can use any currency symbol, from ₹ to $, €, £ or ฿.
      </p>

      <h2>5. Check in halfway, settle on the last evening</h2>
      <p>
        Peek at balances midway so nobody is carrying a big amount for long. On the last night, settle up while everyone’s together. A good app
        will <Link href="/guides/settle-group-debts-fewest-payments">cut the number of payments</Link> to the minimum: a group of ten rarely needs
        more than nine, and often far fewer. If your friends live in different countries, see{' '}
        <Link href="/guides/pay-friends-back-abroad">how to pay friends back abroad</Link>.
      </p>

      <h2>Holiday-season tips</h2>
      <ul>
        <li><strong>Book shared stays early and log the deposit straight away.</strong> It’s the biggest expense and the one people forget.</li>
        <li><strong>Phone signal drops at beaches and in the mountains.</strong> Open the trip once with signal; TripSplit keeps working offline and shows the last balances.</li>
        <li><strong>New Year’s Eve costs more.</strong> Agree a cap for cover charges and club entry, or split them only among the people going.</li>
        <li><strong>Add the app to your home screen.</strong> It opens like an app, with no store download.</li>
      </ul>
    </ArticleShell>
  );
}
