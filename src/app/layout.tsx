import type { Metadata, Viewport } from 'next';
import AuthListener from '@/components/auth/AuthListener';
import { SITE_URL } from '@/lib/marketing/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'TripSplit — Free Splitwise alternative', template: '%s | TripSplit' },
  description: 'Free, open-source app to split trip and group expenses. No daily limit, no ads.',
  applicationName: 'TripSplit',
  appleWebApp: { capable: true, title: 'TripSplit', statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    siteName: 'TripSplit',
    locale: 'en_IN',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'TripSplit: split the trip, not the friendship' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a56db',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased bg-gray-50">
          <AuthListener />
          {children}
        </body>
    </html>
  );
}
