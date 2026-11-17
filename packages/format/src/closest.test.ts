import { describe, expect, it } from 'vitest';
import { closest } from './closest';

describe('closest', () => {
  it('picks the nearest option, preferring a shared prefix on ties', () => {
    expect(closest('mdd', ['odd', 'md', 'lg'])).toBe('md');
    expect(closest('colr', ['class', 'color'])).toBe('color');
  });

  it('returns nothing when every option is too far', () => {
    expect(closest('abcdef', ['uvwxyz', 'abcxyz'])).toBeUndefined();
    expect(closest('ab', [])).toBeUndefined();
  });
});
