import type { Metadata } from 'next';
import ArticleIndex from '@/components/marketing/ArticleIndex';

const intro = 'Notes on building TripSplit, a free and open-source way to split trips with friends.';

export const metadata: Metadata = { title: 'Blog', description: intro, alternates: { canonical: '/blog' } };

export default function Page() {
  return <ArticleIndex kind="blog" title="Blog" intro={intro} />;
}
