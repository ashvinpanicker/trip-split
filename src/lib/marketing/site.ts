export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gotripsplit.app').replace(/\/$/, '');
export const REPO_URL = 'https://github.com/ashvinpanicker/trip-split';
export const SITE_NAME = 'TripSplit';
export const TAGLINE = 'The free Splitwise alternative for group trips';

/** Safe JSON-LD string (escapes "<" per Next.js guidance). */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

export const AUTHOR = { name: 'Ashvin Panicker', url: 'https://ashvinpanicker.com' };

/**
 * Tip links that help pay for the domain and hosting. Leave a value empty to hide it.
 * upi: a UPI ID (e.g. name@okaxis); coffee: full Buy Me a Coffee URL; lightning: Lightning address.
 */
export const SUPPORT = {
  upi: process.env.NEXT_PUBLIC_TIP_UPI || 'Ashiseverything@axl',
  coffee: process.env.NEXT_PUBLIC_TIP_COFFEE_URL || '',
  lightning: process.env.NEXT_PUBLIC_TIP_LIGHTNING || '',
  btc: process.env.NEXT_PUBLIC_TIP_BTC || 'bc1q22dqj78rulaa5trydang968k24dtp3r7ja09m0',
  // USDT addresses, labelled by network so nobody sends on the wrong chain
  usdtTrc20: process.env.NEXT_PUBLIC_TIP_USDT_TRC20 || 'TGCvUK8LawmTBmQxkrNBiJ5k7mor4h6jha',
  usdtErc20: process.env.NEXT_PUBLIC_TIP_USDT_ERC20 || '0xc0026E08B2aD3e919CB5Fb968056cf9D168EE901',
};
export const hasSupport = Boolean(SUPPORT.upi || SUPPORT.coffee || SUPPORT.lightning || SUPPORT.btc || SUPPORT.usdtTrc20 || SUPPORT.usdtErc20);
