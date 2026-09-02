import { describe, expect, it } from 'vitest';
import { previousWeek, weekAt } from '../src/time';

describe('JST week boundary', () => {
  it('switches exactly at Monday 00:00 JST', () => {
    expect(weekAt(Date.parse('2026-09-06T14:59:59.999Z')).id).toBe('2026-08-31');
    expect(weekAt(Date.parse('2026-09-06T15:00:00.000Z')).id).toBe('2026-09-07');
  });
  it('selects the just-closed week', () => expect(previousWeek(Date.parse('2026-09-06T15:05:00Z')).id).toBe('2026-08-31'));
});
