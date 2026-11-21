import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/marketing/site';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The short terms for using TripSplit, a free and open-source expense splitter.',
  alternates: { canonical: '/terms' },
};

export default function Page() {
  return (
    <article className="wrap pt-8 sm:pt-14 prose">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]">Terms of use</h1>
      <p className="!text-sm">Last updated 20 November 2026</p>

      <h2>The service</h2>
      <p>
        TripSplit helps groups record shared expenses and work out who owes whom. It is free to use. The source code is available under the
        MIT licence on <a href="https://github.com/ashvinpanicker/trip-split">GitHub</a>.
      </p>

      <h2>Money</h2>
      <p>
        TripSplit never holds, sends or receives money. Payment buttons open other apps (such as UPI, PayPal or a crypto wallet), and any
        payment happens between you and the other person under that app’s terms. Check amounts, recipients and crypto networks before you pay.
      </p>

      <h2>Your account and content</h2>
      <ul>
        <li>You’re responsible for what you add, and for keeping your sign-in secure.</li>
        <li>Only add people, photos and details you have the right to share with your group.</li>
        <li>Don’t use TripSplit for anything illegal, to harass anyone, or to try to access other groups’ data.</li>
      </ul>

      <h2>No warranty</h2>
      <p>
        TripSplit is provided as is, without warranty of any kind. We work hard to keep the numbers right, and the maths is tested, but please
        check important amounts yourself. To the extent the law allows, we’re not liable for losses from using the service.
      </p>

      <h2>Changes and ending</h2>
      <p>
        We may change or stop the service. If we ever shut it down, we’ll give notice and a way to export your data (a CSV export is already in
        every group). You can stop using TripSplit at any time.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also the <Link href="/privacy">privacy policy</Link>.
      </p>
    </article>
  );
}
