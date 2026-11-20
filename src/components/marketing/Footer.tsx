import Link from 'next/link';
import { REPO_URL } from '@/lib/marketing/site';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--rule)]">
      <div className="wrap py-10 grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr] text-[0.95rem]">
        <div>
          <p className="font-bold text-lg">TripSplit</p>
          <p className="text-[var(--ink-soft)] mt-1 max-w-xs">
            Free, open-source expense splitting for trips, flats and everything in between.
          </p>
        </div>
        <div className="grid gap-2 content-start">
          <Link href="/splitwise-alternative" className="hover:text-[var(--blue)]">Free Splitwise alternative</Link>
          <Link href="/how-to-split-trip-expenses" className="hover:text-[var(--blue)]">How to split trip expenses</Link>
          <Link href="/#faq" className="hover:text-[var(--blue)]">FAQ</Link>
        </div>
        <div className="grid gap-2 content-start">
          <Link href="/register" className="hover:text-[var(--blue)]">Create a free account</Link>
          <a href={REPO_URL} className="hover:text-[var(--blue)]" rel="noopener">Source code on GitHub</a>
          <a href={`${REPO_URL}/blob/main/LICENSE`} className="hover:text-[var(--blue)]" rel="noopener">MIT licence</a>
        </div>
      </div>
      <p className="wrap pb-10 text-xs text-[var(--ink-soft)]">
        Splitwise is a trademark of Splitwise, Inc. TripSplit is an independent open-source project and is not affiliated with Splitwise.
      </p>
    </footer>
  );
}
