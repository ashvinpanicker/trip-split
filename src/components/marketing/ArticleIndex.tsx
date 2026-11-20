import Link from 'next/link';
import { format } from 'date-fns';
import { ARTICLES, type ArticleMeta } from '@/lib/marketing/articles';
import { SITE_URL, jsonLd } from '@/lib/marketing/site';

export default function ArticleIndex({ kind, title, intro }: { kind: ArticleMeta['kind']; title: string; intro: string }) {
  const list = ARTICLES.filter((a) => a.kind === kind);
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description: intro,
    url: `${SITE_URL}/${kind === 'blog' ? 'blog' : 'guides'}`,
    hasPart: list.map((a) => ({ '@type': kind === 'blog' ? 'BlogPosting' : 'Article', headline: a.title, url: `${SITE_URL}${a.path}` })),
  };
  return (
    <section className="wrap pt-8 sm:pt-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <h1 className="text-[2.3rem] sm:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05]">{title}</h1>
      <p className="mt-4 text-lg text-[var(--ink-soft)] max-w-2xl">{intro}</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 max-w-5xl">
        {list.map((a) => (
          <li key={a.path}>
            <Link href={a.path} className="block h-full rounded-2xl border border-[var(--rule)] bg-white p-5 hover:border-[var(--blue)]">
              <p className="font-semibold text-lg leading-snug">{a.title}</p>
              <p className="text-[var(--ink-soft)] mt-2">{a.description}</p>
              <p className="text-sm text-[var(--ink-soft)] mt-3">{format(new Date(a.updated), 'd MMM yyyy')} · {a.readMins} min read</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
