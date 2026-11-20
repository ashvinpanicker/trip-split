import { SITE_URL, REPO_URL } from '@/lib/marketing/site';
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
- Settle-up: computes the minimum number of payments to clear all balances.
- Friends can be added by name before they sign up, then claim their name from one shared invite link.
- Payments: one-tap UPI deep links (India). TripSplit never holds or moves money.
- Currency: Indian rupees (INR) only, for now. No receipt scanning yet. No import from Splitwise yet.

## Pages
- [Home](${SITE_URL}/): overview, comparison with Splitwise's free plan, FAQ
- [Free Splitwise alternative](${SITE_URL}/splitwise-alternative): why people switch and how
- [How to split trip expenses](${SITE_URL}/how-to-split-trip-expenses): step-by-step guide with a worked example
- [Create a free account](${SITE_URL}/register)

## FAQ
${faq.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
