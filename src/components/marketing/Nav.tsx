import Link from 'next/link';

export default function Nav() {
  return (
    <header className="wrap flex items-center justify-between h-16">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight" aria-label="TripSplit home">
        <span aria-hidden className="grid place-items-center w-8 h-8 rounded-[10px] bg-[var(--blue)] text-white text-base">₹</span>
        TripSplit
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2 text-[0.95rem]">
        <Link href="/splitwise-alternative" className="hidden sm:inline px-3 py-2 rounded-full hover:bg-white">Vs Splitwise</Link>
        <Link href="/how-to-split-trip-expenses" className="hidden sm:inline px-3 py-2 rounded-full hover:bg-white">Guide</Link>
        <Link href="/login" className="px-3 py-2 rounded-full hover:bg-white">Sign in</Link>
        <Link href="/register" className="btn btn-primary !h-10 !px-4 text-[0.95rem]">Start free</Link>
      </nav>
    </header>
  );
}
