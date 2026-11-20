import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { AUTHOR, SITE_URL, jsonLd } from '@/lib/marketing/site';
import { articleBy, related, type ArticleMeta } from '@/lib/marketing/articles';

export type Faq = { q: string; a: string };

/** Page metadata for an article, from the shared registry. */
export function articleMetadata(path: string): Metadata {
  const a = articleBy(path);
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: a.path },
    openGraph: {
      title: a.title,
      description: a.description,
      url: a.path,
      type: 'article',
      publishedTime: a.published,
      modifiedTime: a.updated,
      authors: [AUTHOR.url],
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'TripSplit: split the trip, not the friendship' }],
    },
  };
}

function structured(a: ArticleMeta, faq: Faq[], extra: object[]) {
  const url = `${SITE_URL}${a.path}`;
  const section = a.kind === 'blog' ? { name: 'Blog', path: '/blog' } : { name: 'Guides', path: '/guides' };
  return [
    {
      '@context': 'https://schema.org',
      '@type': a.kind === 'blog' ? 'BlogPosting' : 'Article',
      headline: a.title,
      description: a.description,
      url,
      mainEntityOfPage: url,
      datePublished: a.published,
      dateModified: a.updated,
      image: `${SITE_URL}/og.png`,
      author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
      publisher: { '@type': 'Organization', name: 'TripSplit', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'TripSplit', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: section.name, item: `${SITE_URL}${section.path}` },
        { '@type': 'ListItem', position: 3, name: a.title, item: url },
      ],
    },
    ...(faq.length
      ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }]
      : []),
    ...extra,
  ];
}

/**
 * Shared article layout: breadcrumb, title, a direct answer up top (for readers and AI answer engines),
 * the body, an FAQ, related guides and one call to action.
 */
export default function ArticleShell({
  path, answer, faq = [], schema = [], children,
}: { path: string; answer: ReactNode; faq?: Faq[]; schema?: object[]; children: ReactNode }) {
  const a = articleBy(path);
  const section = a.kind === 'blog' ? { name: 'Blog', path: '/blog' } : { name: 'Guides', path: '/guides' };

  return (
    <article className="wrap pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured(a, faq, schema)) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-soft)]">
        <Link href={section.path} className="hover:text-[var(--blue)]">{section.name}</Link>
      </nav>
      <div className="prose mt-3">
        <h1 className="text-[2.2rem] sm:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-[var(--ink)]">{a.title}</h1>
        <p className="!text-sm !mt-4">
          By <a href={AUTHOR.url} rel="author noopener">{AUTHOR.name}</a> · {format(new Date(a.updated), 'd MMMM yyyy')} · {a.readMins} min read
        </p>
        <div className="mt-6 rounded-2xl border border-[var(--rule)] bg-white p-5 [&_p]:!mt-0">
          <p className="!text-[1.1rem] !text-[var(--ink)]">{answer}</p>
        </div>
        {children}

        {faq.length > 0 && (
          <>
            <h2>Questions people ask</h2>
            {faq.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </>
        )}
      </div>

      <aside className="mt-14 max-w-[40rem] rounded-2xl bg-white border border-[var(--rule)] p-6">
        <p className="font-bold text-xl">Splitting a trip right now?</p>
        <p className="text-[var(--ink-soft)] mt-1">TripSplit is free, open source and has no daily limit. Your group joins from one link.</p>
        <Link href="/register" className="btn btn-primary mt-4">Start a group, free</Link>
      </aside>

      <section className="mt-14 max-w-5xl" aria-labelledby="more">
        <h2 id="more" className="text-xl font-bold">More guides</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {related(a.path).map((r) => (
            <li key={r.path}>
              <Link href={r.path} className="block h-full rounded-2xl border border-[var(--rule)] bg-white p-4 hover:border-[var(--blue)]">
                <p className="font-semibold leading-snug">{r.title}</p>
                <p className="text-sm text-[var(--ink-soft)] mt-1">{r.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
