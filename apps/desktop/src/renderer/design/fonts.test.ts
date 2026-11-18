import guide from '../../../../../docs/format.md?raw';
import { describe, expect, it } from 'vitest';
import { bundledFonts } from './fonts';

describe('bundledFonts', () => {
  it('ships the families the format guide lists', () => {
    const listed = [
      ...guide.matchAll(/^\| `([^`]+)` +\| [\d–]+(?: only)? +\| (?:yes|no) +\|/gm),
    ].map(([, family]) => family);
    expect(bundledFonts.map(({ family }) => family)).toEqual(listed);
    expect(listed).toHaveLength(14);
  });

  it('gives each family a latin woff2 file per style', () => {
    for (const { family, files } of bundledFonts) {
      for (const { url } of files)
        expect(url, family).toMatch(/latin-[a-z0-9]+-(normal|italic)\.woff2$/);
    }
  });
});
