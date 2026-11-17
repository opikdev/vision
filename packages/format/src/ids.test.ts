import { describe, expect, it } from 'vitest';
import { createDocument } from './create';
import { generateId } from './ids';

describe('generateId', () => {
  it('slugs the base and picks the lowest free number', () => {
    expect(generateId(createDocument(), 'Cart, Mobile!')).toBe('cart-mobile-1');
    expect(generateId(createDocument(), 'page')).toBe('page-2');
    expect(generateId(createDocument(), '***')).toBe('item-1');
  });
});
