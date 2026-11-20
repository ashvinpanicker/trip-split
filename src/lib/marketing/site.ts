export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://trip-split.tailgrab.workers.dev').replace(/\/$/, '');
export const REPO_URL = 'https://github.com/ashvinpanicker/trip-split';
export const SITE_NAME = 'TripSplit';
export const TAGLINE = 'The free Splitwise alternative for group trips';

/** Safe JSON-LD string (escapes "<" per Next.js guidance). */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
