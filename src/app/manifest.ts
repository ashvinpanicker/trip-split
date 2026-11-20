import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/marketing/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/dashboard',
    name: 'TripSplit',
    short_name: 'TripSplit',
    description: 'Split trip expenses with your group',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#1a56db',
    // Lets Chrome tell the site it's already installed (getInstalledRelatedApps)
    related_applications: [{ platform: 'webapp', url: `${SITE_URL}/manifest.webmanifest` }],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
