import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/marketing/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What TripSplit collects, why, who processes it, and how to delete your data.',
  alternates: { canonical: '/privacy' },
};

export default function Page() {
  return (
    <article className="wrap pt-8 sm:pt-14 prose">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]">Privacy policy</h1>
      <p className="!text-sm">Last updated 20 November 2026</p>
      <p>
        TripSplit is a free, open-source app for splitting group expenses. It has no ads and does not sell or rent your data. This page
        explains what it stores and why. The code is public on <a href="https://github.com/ashvinpanicker/trip-split">GitHub</a>, so you can
        check any of this.
      </p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Your account:</strong> email address, name, and profile photo (from Google if you sign in with Google).</li>
        <li><strong>What you add to a group:</strong> group names, expenses, who paid and who shared, receipt photos, notes, and names of people you add.</li>
        <li><strong>Ways to be paid:</strong> UPI IDs, payment handles or crypto addresses you choose to add to your profile. Group members can see them so they can pay you.</li>
        <li><strong>A change log</strong> of adds, edits and deletes in each group, visible to its members.</li>
      </ul>
      <p>We never store card numbers or bank logins, and TripSplit never moves money.</p>

      <h2>Who can see it</h2>
      <p>
        Only members of a group can see that group’s data. This is enforced in the database with row-level security. Receipt photos are
        stored privately and shown to group members through short-lived links.
      </p>

      <h2>Services we use</h2>
      <ul>
        <li><strong>Supabase</strong> stores the database and photos, and handles sign-in.</li>
        <li><strong>Cloudflare</strong> hosts the website.</li>
        <li><strong>Google</strong> provides “Sign in with Google” (if you use it) and Google Analytics.</li>
      </ul>

      <h2>Analytics and cookies</h2>
      <p>
        We use Google Analytics to count visits and see which pages help people. Advertising features are off, and trip IDs and invite codes
        are removed from page addresses before anything is sent. Cookies keep you signed in; Google Analytics sets its own cookies to count visits.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit your name and payment methods any time in your profile.</li>
        <li>Delete expenses you added, or leave a group.</li>
        <li>
          To delete your account and everything linked to it, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We’ll do it within 30
          days. Expenses you added to shared groups are removed or anonymised so the group’s balances still make sense.
        </li>
      </ul>

      <h2>Children</h2>
      <p>TripSplit is not meant for children under 13.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we’ll update the date above. Big changes will be announced in the app.</p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also the <Link href="/terms">terms of use</Link>.
      </p>
    </article>
  );
}
