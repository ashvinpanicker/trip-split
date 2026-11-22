import Link from 'next/link';
import { LogoMark } from '@/components/Logo';

export default function Nav() {
  return (
    <header className="wrap flex items-center justify-between min-h-16 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight" aria-label="TripSplit home">
        <LogoMark size={32} />
        TripSplit
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2 text-[0.95rem]">
        <Link href="/splitwise-alternative" className="hidden sm:inline px-3 py-2 rounded-full hover:bg-white">Vs Splitwise</Link>
        <Link href="/guides" className="hidden sm:inline px-3 py-2 rounded-full hover:bg-white">Guides</Link>
        <Link href="/login" className="px-3 py-2 rounded-full hover:bg-white">Sign in</Link>
        <Link href="/register" className="btn btn-primary !h-10 !px-4 text-[0.95rem]">Start free</Link>
      </nav>
    </header>
  );
}
