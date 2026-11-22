import { describe, it, expect } from 'vitest';
import { peggedRate, convertSplit, readTripRates } from './fx';

describe('peggedRate', () => {
  it('same currency is 1', () => expect(peggedRate('INR', 'INR')).toBe(1));
  it('ngultrum is pegged 1:1 to the rupee', () => {
    expect(peggedRate('BTN', 'INR')).toBe(1);
    expect(peggedRate('INR', 'BTN')).toBe(1);
  });
  it('Nepali rupee is 1.6 to the Indian rupee', () => {
    expect(peggedRate('NPR', 'INR')).toBeCloseTo(0.625);
    expect(peggedRate('INR', 'NPR')).toBeCloseTo(1.6);
    expect(peggedRate('NPR', 'BTN')).toBeCloseTo(0.625);
  });
  it('unpegged pairs need a market rate', () => expect(peggedRate('THB', 'INR')).toBeNull());
});

describe('convertSplit', () => {
  it('shares always add up to the converted total', () => {
    const r = convertSplit(100, [33.33, 33.33, 33.34], 2.47);
    expect(r.amount).toBe(247);
    expect(Math.round(r.shares.reduce((a, b) => a + b, 0) * 100)).toBe(24700);
  });
  it('puts the rounding remainder on the largest share', () => {
    const r = convertSplit(10, [3.33, 3.33, 3.34], 1.005);
    expect(Math.round(r.shares.reduce((a, b) => a + b, 0) * 100)).toBe(Math.round(r.amount * 100));
  });
  it('rate 1 keeps amounts as they are', () => {
    expect(convertSplit(1200, [400, 800], 1)).toEqual({ amount: 1200, shares: [400, 800] });
  });
});

describe('readTripRates', () => {
  it('keeps only valid currency codes and positive numbers', () => {
    expect(readTripRates({ THB: 2.45, usd: 80, EUR: -1, JPY: 'x', SGD: 62 })).toEqual({ THB: 2.45, SGD: 62 });
    expect(readTripRates(null)).toEqual({});
  });
});
