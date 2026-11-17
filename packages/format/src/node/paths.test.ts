import { describe, expect, it } from 'vitest';
import { assetsDirFor } from './paths';

describe('assetsDirFor', () => {
  it('replaces the .vis extension with .assets', () => {
    expect(assetsDirFor('/a/b/checkout.vis')).toBe('/a/b/checkout.assets');
    expect(assetsDirFor('/a/b/my.design.vis')).toBe('/a/b/my.design.assets');
    expect(assetsDirFor('/a/b/notes')).toBe('/a/b/notes.assets');
  });
});
