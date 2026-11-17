import { describe, expect, it } from 'vitest';
import { assetUrl } from './asset-url';

describe('assetUrl', () => {
  it('keeps https URLs', () => {
    expect(assetUrl('https://example.com/a b.png', 'tok', 2)).toBe('https://example.com/a b.png');
  });

  it('maps relative paths into the asset protocol, encoding each segment', () => {
    expect(assetUrl('photos/hero shot#1.jpg', 'tok', 0)).toBe(
      'vision-asset://tok/photos/hero%20shot%231.jpg?v=0',
    );
    expect(assetUrl('photos\\hero.jpg', 'tok', 3)).toBe('vision-asset://tok/photos/hero.jpg?v=3');
  });
});
