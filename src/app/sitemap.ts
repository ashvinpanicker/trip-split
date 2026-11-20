import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/marketing/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date('2026-11-20');
  return [
    { url: `${SITE_URL}/`, lastModified: updated, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/splitwise-alternative`, lastModified: updated, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/how-to-split-trip-expenses`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/register`, lastModified: updated, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
