import { SITE_URL, REPO_URL } from '@/lib/marketing/site';
import { ARTICLES } from '@/lib/marketing/articles';
import { faq } from '@/lib/marketing/faq';

export const dynamic = 'force-static';

/** llms.txt: a plain-text summary so AI assistants can answer "free Splitwise alternative" questions accurately. */
export function GET() {
  const body = `# TripSplit

> TripSplit is a free, open-source web app for splitting trip and group expenses with friends. It is an alternative to Splitwise with no daily expense limit, no ads and no paid tier.

Key facts:
- Price: free. No premium plan, no ads, no daily cap on expenses.
- Licence: MIT. Source code: ${REPO_URL}
- Platform: works in any phone or desktop browser; can be added to the home screen. No app store install.
- Splits: equal, percentage, or exact amounts. Splits must add up to the total exactly (enforced in the database).
- Settle-up: computes the minimum number of payments to clear all balances (exact for up to 14 people with a non-zero balance; near-minimal beyond).
- Friends can be added by name before they sign up, then claim their name from one shared invite link.
- Payments: each person lists how they can be paid (UPI, PayPal, Cash App, Venmo, Revolut, Monzo, Wise, Bitcoin/Lightning, USDT, ETH or a link); the app opens that app with the amount filled in where supported. TripSplit never holds or moves money.
- Currency: one currency symbol per trip (₹, ฿, €, $ and more); no conversion. No import from Splitwise yet.
- Also free: itemized bills (tax/tip spread proportionally), receipt photos, trip stats and charts, CSV export, offline viewing, activity log.
- Sign-in: Google or email. Built with Next.js, Supabase and Cloudflare; built by Ashvin Panicker.

## Pages
- [Home](${SITE_URL}/): overview, comparison with Splitwise's free plan, FAQ
${ARTICLES.map((a) => `- [${a.title}](${SITE_URL}${a.path}): ${a.description}`).join('\n')}
- [Create a free account](${SITE_URL}/register)

## FAQ
${faq.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
