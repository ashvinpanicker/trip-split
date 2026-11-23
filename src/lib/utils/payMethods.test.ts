import { describe, expect, it } from 'vitest';
import { PAY_METHODS, payActions, readPayMethods } from './payMethods';

describe('pay methods', () => {
  it('cleans handles from pasted links and symbols', () => {
    expect(PAY_METHODS.paypal.clean('https://www.paypal.me/ashvin/')).toBe('ashvin');
    expect(PAY_METHODS.cashapp.clean('$ashvin')).toBe('ashvin');
    expect(PAY_METHODS.venmo.clean('@ash-p')).toBe('ash-p');
    expect(PAY_METHODS.venmo.clean('venmo.com/u/ash-p')).toBe('ash-p');
    expect(PAY_METHODS.revolut.clean('revolut.me/ashvin')).toBe('ashvin');
    expect(PAY_METHODS.upi.clean('Ashiseverything@axl')).toBe('Ashiseverything@axl');
    expect(PAY_METHODS.btc.clean('bc1q22dqj78rulaa5trydang968k24dtp3r7ja09m0')).not.toBeNull();
    expect(PAY_METHODS.usdt_trc20.clean('TGCvUK8LawmTBmQxkrNBiJ5k7mor4h6jha')).not.toBeNull();
    expect(PAY_METHODS.usdt_erc20.clean('0xc0026E08B2aD3e919CB5Fb968056cf9D168EE901')).not.toBeNull();
  });

  it('rejects anything that could become a harmful link', () => {
    expect(PAY_METHODS.link.clean('javascript:alert(1)')).toBeNull();
    expect(PAY_METHODS.link.clean('http://insecure.example')).toBeNull();
    expect(PAY_METHODS.paypal.clean('ash"><script>')).toBeNull();
    expect(PAY_METHODS.venmo.clean('a/b?c=d')).toBeNull();
    expect(PAY_METHODS.btc.clean('not-an-address')).toBeNull();
    expect(readPayMethods([{ type: 'link', value: 'javascript:x' }, { type: 'nope', value: 'x' }, 'junk'])).toEqual([]);
  });

  it('pre-fills amounts only where the app supports that currency', () => {
    const m = readPayMethods([
      { type: 'upi', value: 'ab@okaxis' },
      { type: 'paypal', value: 'ash' },
      { type: 'cashapp', value: 'ash' },
      { type: 'btc', value: 'bc1q22dqj78rulaa5trydang968k24dtp3r7ja09m0' },
    ]);
    const inr = payActions(m, 1300, 'INR', 'Goa', 'Ash');
    expect(inr[0].href).toBe('upi://pay?pa=ab%40okaxis&pn=Ash&am=1300.00&cu=INR&tn=Goa');
    expect(inr[1].href).toBe('https://paypal.me/ash/1300.00INR');
    expect(inr[2].href).toBe('https://cash.app/$ash'); // no rupee amounts on Cash App
    expect(inr[3]).toMatchObject({ label: 'BTC', href: null, copy: true });

    const usd = payActions(m, 25.5, 'USD', 'Tahoe', 'Ash');
    expect(usd.map((a) => a.type)).toEqual(['paypal', 'cashapp', 'btc']); // UPI hidden outside INR
    expect(usd[1].href).toBe('https://cash.app/$ash/25.50');
  });

  it('folds the old UPI field in, dedupes, and caps the list', () => {
    expect(readPayMethods([], 'old@ybl')).toEqual([{ type: 'upi', value: 'old@ybl' }]);
    expect(readPayMethods([{ type: 'upi', value: 'new@ybl' }], 'old@ybl')).toEqual([{ type: 'upi', value: 'new@ybl' }]);
    const many = Array.from({ length: 12 }, (_, i) => ({ type: 'paypal', value: `p${i}` }));
    expect(readPayMethods(many)).toHaveLength(8);
    expect(readPayMethods([{ type: 'paypal', value: 'x' }, { type: 'paypal', value: 'x' }])).toHaveLength(1);
  });
});
