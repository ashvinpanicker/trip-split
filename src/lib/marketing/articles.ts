/** Every guide and blog post, in one place: drives /guides, /blog, the sitemap, llms.txt and related links. */
export type ArticleMeta = {
  path: string;
  kind: 'guide' | 'blog';
  title: string;
  /** Meta description and card blurb: one or two plain sentences */
  description: string;
  published: string;
  updated: string;
  readMins: number;
};

export const ARTICLES: ArticleMeta[] = [
  {
    path: '/guides/split-holiday-trip-expenses',
    kind: 'guide',
    title: 'How to split holiday trip costs with friends (2026 guide)',
    description: 'A simple plan for group trips this holiday season: what to share, how to handle different currencies, and how to settle up before everyone flies home.',
    published: '2026-11-20',
    updated: '2026-11-20',
    readMins: 6,
  },
  {
    path: '/how-to-split-trip-expenses',
    kind: 'guide',
    title: 'How to split trip expenses with friends',
    description: 'Split group trip costs fairly: who pays, uneven shares, and settling up in the fewest payments. With a worked Goa example.',
    published: '2026-11-20',
    updated: '2026-11-20',
    readMins: 5,
  },
  {
    path: '/guides/split-restaurant-bill-by-item',
    kind: 'guide',
    title: 'How to split a restaurant bill when everyone ordered different things',
    description: 'Split by item, then share tax, service and tip in proportion to what each person ordered. A worked example with exact numbers.',
    published: '2026-11-20',
    updated: '2026-11-20',
    readMins: 4,
  },
  {
    path: '/guides/settle-group-debts-fewest-payments',
    kind: 'guide',
    title: 'How to settle group debts in the fewest payments',
    description: 'Why ten friends rarely need more than nine payments, how debt simplification works, and when to pay people back directly instead.',
    published: '2026-11-20',
    updated: '2026-11-20',
    readMins: 5,
  },
  {
    path: '/guides/pay-friends-back-abroad',
    kind: 'guide',
    title: 'How to pay friends back on an international trip',
    description: 'UPI, PayPal, Revolut, Wise, Venmo, Cash App or crypto: how to choose a way to settle up when your group lives in different countries.',
    published: '2026-11-20',
    updated: '2026-11-20',
    readMins: 5,
  },
  {
    path: '/guides/splitwise-daily-limit',
    kind: 'guide',
    title: 'Splitwise’s daily expense limit, explained (and free alternatives)',
    description: 'What changed on Splitwise’s free plan, why it bites on trips, and the free ways to keep splitting without a cap.',
    published: '2026-11-20',
    updated: '2026-11-20',
    readMins: 4,
  },
  {
    path: '/splitwise-alternative',
    kind: 'guide',
    title: 'The free Splitwise alternative with no daily limit',
    description: 'Why people are switching from Splitwise’s free plan, what TripSplit does and doesn’t do, and how to move a group over in five minutes.',
    published: '2026-11-20',
    updated: '2026-11-20',
    readMins: 4,
  },
  {
    path: '/blog/built-tripsplit-in-a-day',
    kind: 'blog',
    title: 'Our Splitwise ran out mid-trip, so we vibecoded our own in a day',
    description: 'Ten friends, a bachelor party in Goa, and a free plan that capped us at a few expenses a day. How I turned a side project into a real app with Claude, while the trip was on.',
    published: '2026-11-20',
    updated: '2026-11-20',
    readMins: 6,
  },
];

export const articleBy = (path: string) => ARTICLES.find((a) => a.path === path)!;
export const related = (path: string, n = 3) => ARTICLES.filter((a) => a.path !== path && a.kind === 'guide').slice(0, n);
