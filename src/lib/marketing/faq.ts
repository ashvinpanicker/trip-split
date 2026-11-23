/** Shared FAQ: rendered on the home page and emitted as FAQPage structured data. Answers lead with the answer. */
export const faq: { q: string; a: string }[] = [
  {
    q: 'Is there a free alternative to Splitwise?',
    a: 'Yes. TripSplit is a free, open-source alternative to Splitwise for splitting group expenses. It has no daily limit on how many expenses you can add, no ads, and no paid tier. It runs in your phone’s browser, so nobody has to install anything.',
  },
  {
    q: 'Is TripSplit really free? What’s the catch?',
    a: 'It’s free with no catch. TripSplit is open source under the MIT licence and runs on low-cost hosting, so there is no premium plan to upsell and no ads. You can read every line of code on GitHub, or run your own copy.',
  },
  {
    q: 'Does TripSplit limit how many expenses I can add per day?',
    a: 'No. You can add as many expenses as you like, any time. There are no counters, wait timers or ads between entries.',
  },
  {
    q: 'How do I split trip expenses with friends?',
    a: 'Create a group for the trip, add your friends by name, and share one invite link in your WhatsApp group. Whoever pays adds the expense and picks who it was for. At the end, TripSplit shows the fewest payments needed so everyone is square.',
  },
  {
    q: 'Do my friends need to download an app or sign up first?',
    a: 'No download is needed: TripSplit works in any phone browser and can be added to the home screen. You can add friends by name and split expenses with them straight away; they sign up later from the group link, pick their name, and everything already logged for them moves to their account.',
  },
  {
    q: 'How does TripSplit work out who owes whom?',
    a: 'It adds up what each person paid and what each person’s share was, so everyone ends with one balance. Then it finds the smallest number of payments that clears every balance, including spotting people whose balances cancel each other out. All maths is done in whole paise, so totals always add up exactly.',
  },
  {
    q: 'How do I pay friends back: UPI, PayPal, Venmo, Revolut or crypto?',
    a: 'Each person adds the ways they can be paid in their profile: UPI, PayPal, Cash App, Venmo, Revolut, Monzo, Wise, Bitcoin, Lightning, USDT, ETH or any payment link. When you owe them, TripSplit shows a button that opens that app with the amount filled in where the app allows it, or copies the address for crypto. The money goes directly between you; TripSplit never holds or moves money. Then tap “Mark paid”.',
  },
  {
    q: 'Can I split unequally, by percentage or exact amounts?',
    a: 'Yes. Every expense can be split equally, by percentage, or by exact amounts per person. TripSplit won’t save a split unless it adds up exactly to the total.',
  },
  {
    q: 'Which currencies does TripSplit support?',
    a: 'Each trip can use its own currency symbol, like ₹, ฿, € or $. TripSplit doesn’t convert between currencies, so log a trip’s expenses in one currency.',
  },
  {
    q: 'Is my data private?',
    a: 'Only members of a group can see that group’s expenses. This is enforced in the database with row-level security, not just in the app. TripSplit has no ads and does not sell data. The website uses Google Analytics to count visits, with ad features switched off and trip IDs and invite codes removed from page addresses.',
  },
  {
    q: 'How do I sign in?',
    a: 'Tap “Sign in with Google” and you’re in, or use an email and password. Friends you invite can join the same way from one link.',
  },
  {
    q: 'What is TripSplit built with?',
    a: 'Next.js and React for the app, Supabase (Postgres with row-level security) for data and sign-in, and Cloudflare for hosting. It was built by Ashvin Panicker, and the code is open on GitHub.',
  },
];
