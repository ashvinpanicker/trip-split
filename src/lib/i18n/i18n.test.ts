import { describe, it, expect } from 'vitest';
import { translate, DICTS } from './index';

const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('translations', () => {
  it('fills in variables', () => {
    expect(translate('en', 'exp.youOwe', { amount: '₹500' })).toBe('you owe ₹500');
    expect(translate('hi', 'exp.youOwe', { amount: '₹500' })).toBe('आपको ₹500 देने हैं');
  });
  it('every Hindi string keeps exactly the same {placeholders} as English', () => {
    for (const [key, text] of Object.entries(DICTS.hi)) {
      expect(holes(text!), key).toBe(holes((DICTS.en as Record<string, string>)[key]));
    }
  });
  it('falls back to English for anything not translated', () => {
    expect(translate('hi', 'nav.home')).toBe('होम');
  });
});
