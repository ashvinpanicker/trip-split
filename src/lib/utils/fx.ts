/**
 * Multi-currency trips. Balances always stay in the trip's currency; an expense paid in
 * another currency is converted once, when it's saved, and keeps its original amount and rate.
 */

/** Currencies fixed to another by law: no market rate needed. 1 key = rate × base. */
const PEGS: Record<string, { base: string; rate: number }> = {
  BTN: { base: 'INR', rate: 1 },     // Bhutanese ngultrum = Indian rupee
  NPR: { base: 'INR', rate: 0.625 }, // ₹1 = 1.6 Nepali rupees
};

/** Exact rate between two currencies when a peg decides it, else null. */
export function peggedRate(from: string, to: string): number | null {
  if (from === to) return 1;
  const f = PEGS[from], t = PEGS[to];
  if (f && f.base === to) return f.rate;
  if (t && t.base === from) return 1 / t.rate;
  if (f && t && f.base === t.base) return f.rate / t.rate;
  return null;
}

/** Trip currency per 1 unit of `from`, for that date. Peg first, then a free daily rate feed. */
export async function fetchRate(from: string, to: string, date: string): Promise<number | null> {
  const peg = peggedRate(from, to);
  if (peg) return peg;
  const f = from.toLowerCase(), t = to.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const tag = date && date < today ? date : 'latest';
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${tag}/v1/currencies/${f}.min.json`,
    `https://${tag}.currency-api.pages.dev/v1/currencies/${f}.min.json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const rate = (await res.json())?.[f]?.[t];
      if (typeof rate === 'number' && rate > 0) return rate;
    } catch {}
  }
  return null;
}

const paise = (n: number) => Math.round(n * 100);

/**
 * Convert an amount and its shares into the trip currency.
 * Shares are rounded to the cent, and any rounding remainder goes to the largest share,
 * so they always add up to the converted total exactly.
 */
export function convertSplit(amount: number, shares: number[], rate: number): { amount: number; shares: number[] } {
  const total = paise(amount * rate);
  const raw = shares.map((s) => paise(s * rate));
  const diff = total - raw.reduce((a, b) => a + b, 0);
  if (diff !== 0 && raw.length) {
    let i = 0;
    raw.forEach((v, k) => { if (v > raw[i]) i = k; });
    raw[i] += diff;
  }
  return { amount: total / 100, shares: raw.map((v) => v / 100) };
}

/** Rates the trip has fixed ("use my actual rate"), keyed by currency code. */
export function readTripRates(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (/^[A-Z]{3}$/.test(k) && typeof v === 'number' && v > 0 && isFinite(v)) out[k] = v;
    }
  }
  return out;
}
