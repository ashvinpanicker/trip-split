import { describe, expect, it } from 'vitest';
import { groupColors, groupColor } from './groupColor';

describe('group colours', () => {
  it('gives every trip its own colour (up to 8) and keeps them when a trip is added', () => {
    const ids = Array.from({ length: 8 }, (_, i) => ({ id: `g-${i}-${'x'.repeat(i)}`, created_at: `2026-11-0${i + 1}` }));
    const first = groupColors(ids.slice(0, 5));
    expect(new Set(Object.values(first).map((c) => c.dot)).size).toBe(5);
    const all = groupColors(ids);
    expect(new Set(Object.values(all).map((c) => c.dot)).size).toBe(8);
    for (const g of ids.slice(0, 5)) expect(all[g.id]).toEqual(first[g.id]);
  });

  it('is stable for a given id', () => {
    expect(groupColor('abc')).toEqual(groupColor('abc'));
  });
});
