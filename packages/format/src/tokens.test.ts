import { describe, expect, it } from 'vitest';
import { tokensToThemeCss } from './tokens';

describe('tokensToThemeCss', () => {
  it('turns tokens into theme variables, grouped and sorted', () => {
    expect(
      tokensToThemeCss({
        spacing: { gutter: '24px' },
        color: { 'fg-muted': '#6B6B66', brand: '#1F3D2B' },
        font: { sans: 'Inter, system-ui, sans-serif' },
        text: { title: '28px' },
        radius: { card: '12px' },
        shadow: { card: '0 2px 6px rgb(0 0 0 / 0.08)' },
      }),
    ).toBe(`@theme {
  --color-brand: #1F3D2B;
  --color-fg-muted: #6B6B66;
  --font-sans: Inter, system-ui, sans-serif;
  --text-title: 28px;
  --radius-card: 12px;
  --shadow-card: 0 2px 6px rgb(0 0 0 / 0.08);
  --spacing-gutter: 24px;
}
`);
  });

  it('returns an empty theme without tokens', () => {
    expect(tokensToThemeCss()).toBe('@theme {\n}\n');
  });
});
