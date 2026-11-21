import type { Metadata } from 'next';
import ArticleIndex from '@/components/marketing/ArticleIndex';

const title = 'Guides to splitting trips and group expenses';
const intro = 'Practical, honest guides for group trips: splitting holiday costs, restaurant bills, paying friends back abroad, and settling up in the fewest payments.';

export const metadata: Metadata = { title, description: intro, alternates: { canonical: '/guides' } };

export default function Page() {
  return <ArticleIndex kind="guide" title="Guides" intro={intro} />;
}
