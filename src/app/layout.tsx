import type { Metadata, Viewport } from 'next';
import AuthListener from '@/components/auth/AuthListener';
import Analytics from '@/components/Analytics';
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
    locale: 'en_US',
    alternateLocale: ['en_IN', 'en_GB'],
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'TripSplit: split the trip, not the friendship' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Browser bar colour follows light/dark so the top of the screen matches the app
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b111c' },
  ],
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
          <Analytics />
          {children}
        </body>
    </html>
  );
}
