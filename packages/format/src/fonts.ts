import type { Tokens } from './schema';

export interface FontFile {
  style: 'normal' | 'italic';
  weight: string;
  url: string;
}

/** A font family the app ships, so designs naming it draw the same on every machine. */
export interface BundledFont {
  family: string;
  files: FontFile[];
}

/** `@font-face` rules for the bundled families that the design's font tokens name. */
export function fontFaceCss(tokens: Tokens | undefined, fonts: readonly BundledFont[]): string {
  const named = new Set(
    Object.values(tokens?.font ?? {}).flatMap((value) =>
      value.split(',').map((family) =>
        family
          .trim()
          .replace(/^(["'])(.*)\1$/, '$2')
          .toLowerCase(),
      ),
    ),
  );
  return fonts
    .filter(({ family }) => named.has(family.toLowerCase()))
    .flatMap(({ family, files }) =>
      files.map(
        ({ style, weight, url }) =>
          `@font-face {\n  font-family: ${JSON.stringify(family)};\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: block;\n  src: url(${JSON.stringify(url)}) format("woff2");\n}\n`,
      ),
    )
    .join('');
}
