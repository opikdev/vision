import { describe, expect, it } from 'vitest';
import { relativeTime } from './relative-time';

describe('relativeTime', () => {
  it.each([
    [0, 'just now'],
    [999, 'just now'],
    [4_000, '4s ago'],
    [59_999, '59s ago'],
    [60_000, '1m ago'],
    [3_599_000, '59m ago'],
    [7_200_000, '2h ago'],
    [90_000_000, '1d ago'],
    [-5_000, 'just now'],
  ])('%i ms ago reads "%s"', (elapsed, text) => {
    expect(relativeTime(1_000_000_000 - elapsed, 1_000_000_000)).toBe(text);
  });
});
