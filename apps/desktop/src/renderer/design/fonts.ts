import bricolageGrotesque from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2?url';
import dmSansItalic from '@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-italic.woff2?url';
import dmSans from '@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-normal.woff2?url';
import frauncesItalic from '@fontsource-variable/fraunces/files/fraunces-latin-opsz-italic.woff2?url';
import fraunces from '@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2?url';
import geistMonoItalic from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-italic.woff2?url';
import geistMono from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url';
import geistItalic from '@fontsource-variable/geist/files/geist-latin-wght-italic.woff2?url';
import geist from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import ibmPlexSansItalic from '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-italic.woff2?url';
import ibmPlexSans from '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2?url';
import interItalic from '@fontsource-variable/inter/files/inter-latin-opsz-italic.woff2?url';
import inter from '@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2?url';
import jetbrainsMonoItalic from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-italic.woff2?url';
import jetbrainsMono from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url';
import manrope from '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url';
import newsreaderItalic from '@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2?url';
import newsreader from '@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2?url';
import playfairDisplayItalic from '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-italic.woff2?url';
import playfairDisplay from '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2?url';
import plusJakartaSansItalic from '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-italic.woff2?url';
import plusJakartaSans from '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url';
import spaceGrotesk from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url';
import instrumentSerifItalic from '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2?url';
import instrumentSerif from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url';
import type { BundledFont } from '@vision/format';

function family(name: string, weight: string, normal: string, italic?: string): BundledFont {
  return {
    family: name,
    files: [
      { style: 'normal', weight, url: normal },
      ...(italic === undefined ? [] : [{ style: 'italic' as const, weight, url: italic }]),
    ],
  };
}

export const bundledFonts: BundledFont[] = [
  family('Inter', '100 900', inter, interItalic),
  family('Geist', '100 900', geist, geistItalic),
  family('DM Sans', '100 1000', dmSans, dmSansItalic),
  family('Manrope', '200 800', manrope),
  family('Plus Jakarta Sans', '200 800', plusJakartaSans, plusJakartaSansItalic),
  family('Space Grotesk', '300 700', spaceGrotesk),
  family('IBM Plex Sans', '100 700', ibmPlexSans, ibmPlexSansItalic),
  family('Bricolage Grotesque', '200 800', bricolageGrotesque),
  family('Fraunces', '100 900', fraunces, frauncesItalic),
  family('Instrument Serif', '400', instrumentSerif, instrumentSerifItalic),
  family('Newsreader', '200 800', newsreader, newsreaderItalic),
  family('Playfair Display', '400 900', playfairDisplay, playfairDisplayItalic),
  family('JetBrains Mono', '100 800', jetbrainsMono, jetbrainsMonoItalic),
  family('Geist Mono', '100 900', geistMono, geistMonoItalic),
];
