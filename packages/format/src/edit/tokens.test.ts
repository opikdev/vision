import { describe, expect, it } from 'vitest';
import { createDocument } from '../create';
import { EditError } from './error';
import { setTokens, type TokensPatch } from './tokens';

describe('setTokens', () => {
  it('deep merges, deletes with null and drops empty groups', () => {
    const doc = {
      ...createDocument(),
      tokens: { color: { brand: '#000', fg: '#111' }, radius: { card: '8px' } },
    };
    const result = setTokens(doc, {
      color: { brand: '#1F3D2B', fg: null, line: '#DDD8CC' },
      radius: { card: null },
    });
    expect(result.tokens).toEqual({ color: { brand: '#1F3D2B', line: '#DDD8CC' } });
    expect(doc.tokens.color.brand).toBe('#000');
  });

  it('removes tokens entirely when the last one is deleted', () => {
    const doc = { ...createDocument(), tokens: { font: { sans: 'Inter' } } };
    expect('tokens' in setTokens(doc, { font: { sans: null } })).toBe(false);
  });

  it('rejects bad names, values and groups', () => {
    expect(() => setTokens(createDocument(), { color: { Brand: '#fff' } })).toThrow(
      new EditError(
        'Invalid token color.Brand: "#fff". Token names use lowercase letters and digits separated by single dashes, such as "fg-muted".',
      ),
    );
    expect(() => setTokens(createDocument(), { spacing: { gutter: '24' } })).toThrow(
      'Invalid token spacing.gutter: "24". Use a CSS length with a unit, such as "12px" or "1.5rem".',
    );
    expect(() => setTokens(createDocument(), { colors: { brand: '#fff' } } as TokensPatch)).toThrow(
      'Unknown token group "colors". Use color, font, text, radius, shadow, spacing.',
    );
  });
});
