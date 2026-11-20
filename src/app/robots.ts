import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/marketing/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // Group pages and invite links hold people's names and money: keep them out of search
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/groups', '/balances', '/profile', '/join', '/api'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
