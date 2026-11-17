import { describe, expect, it } from 'vitest';
import { assetUrl } from './asset-url';

describe('assetUrl', () => {
  it('keeps https URLs', () => {
    expect(assetUrl('https://example.com/a b.png', 'tok')).toBe('https://example.com/a b.png');
  });

  it('maps relative paths into the asset protocol, encoding each segment', () => {
    expect(assetUrl('photos/hero shot#1.jpg', 'tok')).toBe(
      'vision-asset://tok/photos/hero%20shot%231.jpg',
    );
    expect(assetUrl('photos\\hero.jpg', 'tok')).toBe('vision-asset://tok/photos/hero.jpg');
  });
});
