/**
 * Ways friends can pay each other, worldwide. TripSplit never moves money: each method
 * either opens the payment app with the amount filled in, or copies an address.
 *
 * Every link is built from a cleaned handle, never from raw user input, so a value
 * can't smuggle in another scheme (javascript:, data:, …).
 */

export type PayMethodType =
  | 'upi' | 'paypal' | 'cashapp' | 'venmo' | 'revolut' | 'monzo' | 'wise'
  | 'btc' | 'lightning' | 'usdt_trc20' | 'usdt_erc20' | 'eth' | 'link';

export type PayMethod = { type: PayMethodType; value: string };

type Def = {
  label: string;
  /** Shown on the pay button / copy chip */
  short: string;
  placeholder: string;
  hint: string;
  /** Returns the cleaned value, or null if it isn't valid for this method */
  clean: (raw: string) => string | null;
  /** A payment link for this amount, or null when the method is copy-only */
  link?: (value: string, amount: number, currency: string, note: string, name: string) => string | null;
  /** Crypto and the like: copy the address */
  copy?: boolean;
};

const handle = (raw: string, prefixes: RegExp) => {
  const v = raw.trim().replace(prefixes, '').replace(/^[@$]/, '').replace(/\/+$/, '');
  return /^[A-Za-z0-9._-]{1,64}$/.test(v) ? v : null;
};
const money = (n: number) => n.toFixed(2);

export const PAY_METHODS: Record<PayMethodType, Def> = {
  upi: {
    label: 'UPI (India)', short: 'UPI', placeholder: 'yourname@okaxis', hint: 'GPay, PhonePe, Paytm',
    clean: (r) => (/^[\w.-]{2,256}@[A-Za-z]{2,64}$/.test(r.trim()) ? r.trim() : null),
    // UPI only moves rupees
    link: (v, amt, cur, note, name) =>
      cur === 'INR' ? `upi://pay?${new URLSearchParams({ pa: v, pn: name, am: money(amt), cu: 'INR', tn: note.slice(0, 50) })}` : null,
  },
  paypal: {
    label: 'PayPal', short: 'PayPal', placeholder: 'paypal.me/yourname', hint: 'Your PayPal.me name',
    clean: (r) => handle(r, /^(https?:\/\/)?(www\.)?paypal\.me\//i),
    link: (v, amt, cur) => `https://paypal.me/${encodeURIComponent(v)}/${money(amt)}${cur}`,
  },
  cashapp: {
    label: 'Cash App', short: 'Cash App', placeholder: '$yourtag', hint: 'Your $Cashtag (US and UK)',
    clean: (r) => handle(r, /^(https?:\/\/)?cash\.app\/\$?/i),
    link: (v, amt, cur) => `https://cash.app/$${encodeURIComponent(v)}${cur === 'USD' || cur === 'GBP' ? `/${money(amt)}` : ''}`,
  },
  venmo: {
    label: 'Venmo', short: 'Venmo', placeholder: '@your-name', hint: 'Your Venmo username (US)',
    clean: (r) => handle(r, /^(https?:\/\/)?(www\.)?venmo\.com\/(u\/)?/i),
    link: (v, amt, cur, note) =>
      `https://venmo.com/${encodeURIComponent(v)}?${new URLSearchParams(cur === 'USD' ? { txn: 'pay', amount: money(amt), note } : { txn: 'pay', note })}`,
  },
  revolut: {
    label: 'Revolut', short: 'Revolut', placeholder: 'revolut.me/yourname', hint: 'Your Revtag',
    clean: (r) => handle(r, /^(https?:\/\/)?(www\.)?revolut\.me\//i),
    link: (v) => `https://revolut.me/${encodeURIComponent(v)}`,
  },
  monzo: {
    label: 'Monzo', short: 'Monzo', placeholder: 'monzo.me/yourname', hint: 'Your monzo.me name (UK)',
    clean: (r) => handle(r, /^(https?:\/\/)?(www\.)?monzo\.me\//i),
    link: (v, amt, cur, note) =>
      `https://monzo.me/${encodeURIComponent(v)}${cur === 'GBP' ? `/${money(amt)}?d=${encodeURIComponent(note)}` : ''}`,
  },
  wise: {
    label: 'Wise', short: 'Wise', placeholder: 'wise.com/pay/me/yourname', hint: 'Your Wisetag',
    clean: (r) => handle(r, /^(https?:\/\/)?(www\.)?wise\.com\/pay\/me\//i),
    link: (v) => `https://wise.com/pay/me/${encodeURIComponent(v)}`,
  },
  btc: {
    label: 'Bitcoin', short: 'BTC', placeholder: 'bc1q…', hint: 'On-chain address',
    clean: (r) => (/^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(r.trim()) ? r.trim() : null),
    copy: true,
  },
  lightning: {
    label: 'Bitcoin Lightning', short: '⚡ Lightning', placeholder: 'you@walletofsatoshi.com', hint: 'Lightning address',
    clean: (r) => (/^[\w.+-]{1,64}@[\w-]+(\.[\w-]+)+$/.test(r.trim()) ? r.trim().toLowerCase() : null),
    link: (v) => `lightning:${v}`,
    copy: true,
  },
  usdt_trc20: {
    label: 'USDT (TRC-20, Tron)', short: 'USDT TRC-20', placeholder: 'T…', hint: 'Tron address, starts with T',
    clean: (r) => (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(r.trim()) ? r.trim() : null),
    copy: true,
  },
  usdt_erc20: {
    label: 'USDT (ERC-20, Ethereum)', short: 'USDT ERC-20', placeholder: '0x…', hint: 'Ethereum address',
    clean: (r) => (/^0x[0-9a-fA-F]{40}$/.test(r.trim()) ? r.trim() : null),
    copy: true,
  },
  eth: {
    label: 'Ethereum (ETH)', short: 'ETH', placeholder: '0x… or name.eth', hint: 'Address or ENS name',
    clean: (r) => (/^(0x[0-9a-fA-F]{40}|[a-z0-9-]{1,63}\.eth)$/.test(r.trim()) ? r.trim() : null),
    copy: true,
  },
  link: {
    label: 'Other payment link', short: 'Pay link', placeholder: 'https://…', hint: 'Any https payment page',
    clean: (r) => {
      try {
        const u = new URL(r.trim());
        return u.protocol === 'https:' && r.trim().length <= 200 ? u.toString() : null;
      } catch {
        return null;
      }
    },
    link: (v) => v,
  },
};

export const PAY_METHOD_ORDER: PayMethodType[] = [
  'upi', 'paypal', 'revolut', 'wise', 'venmo', 'cashapp', 'monzo', 'lightning', 'btc', 'usdt_trc20', 'usdt_erc20', 'eth', 'link',
];

/** Validated methods only, at most 8, legacy upi_id folded in. */
export function readPayMethods(raw: unknown, legacyUpi?: string | null): PayMethod[] {
  const list: PayMethod[] = [];
  if (Array.isArray(raw)) {
    for (const m of raw) {
      const def = m && PAY_METHODS[(m as PayMethod).type];
      const v = def && typeof (m as PayMethod).value === 'string' ? def.clean((m as PayMethod).value) : null;
      if (v && !list.some((x) => x.type === (m as PayMethod).type && x.value === v)) list.push({ type: (m as PayMethod).type, value: v });
    }
  }
  if (legacyUpi && !list.some((m) => m.type === 'upi')) {
    const v = PAY_METHODS.upi.clean(legacyUpi);
    if (v) list.unshift({ type: 'upi', value: v });
  }
  return list.slice(0, 8);
}

/** What to show on a settle-up row: links that work for this currency first, then copy chips. */
export function payActions(methods: PayMethod[], amount: number, currency: string, note: string, name: string) {
  return methods
    .map((m) => {
      const def = PAY_METHODS[m.type];
      const href = def.link?.(m.value, amount, currency, note, name) ?? null;
      return { ...m, label: def.short, href, copy: !!def.copy };
    })
    .filter((a) => a.href || a.copy);
}
