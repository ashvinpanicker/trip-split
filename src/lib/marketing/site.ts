export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://trip-split.tailgrab.workers.dev').replace(/\/$/, '');
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
  btc: process.env.NEXT_PUBLIC_TIP_BTC || '',
  usdt: process.env.NEXT_PUBLIC_TIP_USDT || '',
  /** Network for the USDT address, e.g. "TRC-20" or "ERC-20". Shown so people don't send on the wrong chain. */
  usdtNetwork: process.env.NEXT_PUBLIC_TIP_USDT_NETWORK || '',
};
export const hasSupport = Boolean(SUPPORT.upi || SUPPORT.coffee || SUPPORT.lightning || SUPPORT.btc || SUPPORT.usdt);
