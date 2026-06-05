import type { Metadata, Viewport } from 'next';
import AuthListener from '@/components/auth/AuthListener';
import './globals.css';

export const metadata: Metadata = {
  title: 'TripSplit - Share Expenses Easily',
  description: 'Track and split shared expenses with friends and groups',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
