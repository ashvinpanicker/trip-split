import type { Metadata } from 'next';

// Personal balance links: never in search results
export const metadata: Metadata = {
  title: 'Your trip balance · TripSplit',
  robots: { index: false, follow: false },
};

export default function BalanceLinkLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-gray-50">{children}</div>;
}
