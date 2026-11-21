import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/marketing/site';
import { ARTICLES } from '@/lib/marketing/articles';

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date('2026-11-20');
  return [
    { url: `${SITE_URL}/`, lastModified: updated, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/guides`, lastModified: updated, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: updated, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: updated, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: updated, changeFrequency: 'yearly', priority: 0.2 },
    ...ARTICLES.map((a) => ({
      url: `${SITE_URL}${a.path}`,
      lastModified: new Date(a.updated),
      changeFrequency: 'monthly' as const,
      priority: a.path === '/splitwise-alternative' ? 0.9 : a.kind === 'guide' ? 0.8 : 0.6,
    })),
    { url: `${SITE_URL}/register`, lastModified: updated, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
