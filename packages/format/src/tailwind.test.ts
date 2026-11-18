import type * as Tailwind from 'tailwindcss';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createTailwindEngine, type TailwindEngine } from './tailwind';
import type { VisionDocument } from './schema';
import { docWith } from './test-fixtures';
import { loadTailwindStylesheets } from './test-tailwind';

const loads = vi.hoisted(() => ({ count: 0 }));

vi.mock('tailwindcss', async (importOriginal) => {
  const tailwind = await importOriginal<typeof Tailwind>();
  return {
    ...tailwind,
    __unstable__loadDesignSystem: (
      ...args: Parameters<typeof tailwind.__unstable__loadDesignSystem>
    ) => {
      loads.count++;
      return tailwind.__unstable__loadDesignSystem(...args);
    },
  };
});

let engine: TailwindEngine;

function setArtboardClass(doc: VisionDocument, value: string): void {
  const board = doc.pages[0]?.artboards[0];
  if (board) board.class = value;
}

beforeAll(async () => {
  engine = createTailwindEngine(await loadTailwindStylesheets());
});

const tokens = {
  color: { brand: '#1F3D2B', 'fg-muted': '#6B6B66' },
  radius: { card: '12px' },
  spacing: { gutter: '24px' },
};

describe('css', () => {
  it('compiles token classes, variants and preflight for the document', async () => {
    const doc = docWith(
      [{ type: 'frame', id: 'a', class: 'bg-brand rounded-card p-gutter md:flex dark:bg-brand' }],
      {
        tokens,
      },
    );
    setArtboardClass(doc, 'text-fg-muted');
    const css = await engine.css(doc);
    expect(css).toContain('--color-brand: #1F3D2B;');
    expect(css).toContain('.bg-brand {\n    background-color: var(--color-brand);');
    expect(css).toContain('.text-fg-muted {\n    color: var(--color-fg-muted);');
    expect(css).toContain('.rounded-card {\n    border-radius: var(--radius-card);');
    expect(css).toContain('.p-gutter {\n    padding: var(--spacing-gutter);');
    expect(css).toContain('@media (width >= 48rem) {\n    .md\\:flex {\n      display: flex;');
    expect(css).toContain('.dark\\:bg-brand:where([data-theme=dark], [data-theme=dark] *) {');
    expect(css).toContain(':root, :host {');
    expect(css).toContain('box-sizing: border-box;');
  });

  it('adds @font-face rules for bundled families that font tokens name', async () => {
    const fonts = [
      {
        family: 'Fraunces',
        files: [
          {
            style: 'normal' as const,
            weight: '100 900',
            url: 'app://vision/assets/fraunces.woff2',
          },
          {
            style: 'italic' as const,
            weight: '100 900',
            url: 'app://vision/assets/fraunces-i.woff2',
          },
        ],
      },
      {
        family: 'Instrument Serif',
        files: [{ style: 'normal' as const, weight: '400', url: 'app://vision/assets/is.woff2' }],
      },
      {
        family: 'Geist',
        files: [
          { style: 'normal' as const, weight: '100 900', url: 'app://vision/assets/geist.woff2' },
        ],
      },
    ];
    const withFonts = createTailwindEngine(await loadTailwindStylesheets(), fonts);
    const css = await withFonts.css(
      docWith([], {
        tokens: {
          font: {
            display: "'instrument serif', serif",
            serif: 'Fraunces, Georgia, serif',
            sans: 'Söhne, system-ui, sans-serif',
          },
        },
      }),
    );
    expect(css.slice(0, css.indexOf('/*! tailwindcss'))).toBe(
      [
        '@font-face {',
        '  font-family: "Fraunces";',
        '  font-style: normal;',
        '  font-weight: 100 900;',
        '  font-display: block;',
        '  src: url("app://vision/assets/fraunces.woff2") format("woff2");',
        '}',
        '@font-face {',
        '  font-family: "Fraunces";',
        '  font-style: italic;',
        '  font-weight: 100 900;',
        '  font-display: block;',
        '  src: url("app://vision/assets/fraunces-i.woff2") format("woff2");',
        '}',
        '@font-face {',
        '  font-family: "Instrument Serif";',
        '  font-style: normal;',
        '  font-weight: 400;',
        '  font-display: block;',
        '  src: url("app://vision/assets/is.woff2") format("woff2");',
        '}',
        '',
      ].join('\n'),
    );
    expect(css).toContain('--font-sans: Söhne, system-ui, sans-serif;');
  });

  it('adds no @font-face for families it does not bundle', async () => {
    const css = await engine.css(
      docWith([], { tokens: { font: { sans: 'Fraunces, Georgia, serif' } } }),
    );
    expect(css).not.toContain('@font-face');
  });

  it('starts fresh for each document', async () => {
    await engine.css(docWith([{ type: 'frame', id: 'a', class: 'grid' }]));
    const css = await engine.css(docWith([{ type: 'frame', id: 'a', class: 'flex' }]));
    expect(css).toContain('.flex {');
    expect(css).not.toContain('.grid {');
  });
});

describe('classDiagnostics', () => {
  it('loads the class checker once while the tokens stay the same', async () => {
    const fresh = createTailwindEngine(await loadTailwindStylesheets());
    const before = loads.count;
    await fresh.classDiagnostics(docWith([{ type: 'frame', id: 'a', class: 'flx' }], { tokens }));
    await fresh.classDiagnostics(docWith([{ type: 'frame', id: 'b', class: 'gird' }], { tokens }));
    expect(loads.count - before).toBe(1);
    await fresh.classDiagnostics(docWith([], { tokens: { color: { other: '#000000' } } }));
    expect(loads.count - before).toBe(2);
  });

  it('accepts valid utilities, arbitrary values, variants, tokens and group markers', async () => {
    const doc = docWith(
      [
        {
          type: 'frame',
          id: 'a',
          class:
            'group peer group/card peer/x flex md:flex w-[320px] hover:bg-brand/50 group-hover:underline rounded-card text-fg-muted dark:bg-brand',
        },
      ],
      { tokens },
    );
    expect(await engine.classDiagnostics(doc)).toEqual([]);
  });

  it('warns about unknown classes with a suggestion', async () => {
    const doc = docWith(
      [
        {
          type: 'frame',
          id: 'card',
          class: 'flex bg-brnd',
          children: [
            { type: 'text', id: 'label', class: 'mdd:flex text-fg-mute/50 foo-bar', text: '' },
          ],
        },
      ],
      { tokens },
    );
    expect(await engine.classDiagnostics(doc)).toEqual([
      {
        severity: 'warning',
        code: 'unknown-class',
        message: 'Unknown class "bg-brnd"',
        hint: 'Did you mean `bg-brand`?',
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'class'],
        pageId: 'page',
        artboardId: 'board',
        nodeId: 'card',
      },
      {
        severity: 'warning',
        code: 'unknown-class',
        message: 'Unknown class "mdd:flex"',
        hint: 'Did you mean `md:flex`?',
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'children', 0, 'class'],
        pageId: 'page',
        artboardId: 'board',
        nodeId: 'label',
      },
      {
        severity: 'warning',
        code: 'unknown-class',
        message: 'Unknown class "text-fg-mute/50"',
        hint: 'Did you mean `text-fg-muted/50`?',
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'children', 0, 'class'],
        pageId: 'page',
        artboardId: 'board',
        nodeId: 'label',
      },
      {
        severity: 'warning',
        code: 'unknown-class',
        message: 'Unknown class "foo-bar"',
        hint: 'Check the spelling against the Tailwind CSS v4 docs, or use an arbitrary value such as w-[320px].',
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'children', 0, 'class'],
        pageId: 'page',
        artboardId: 'board',
        nodeId: 'label',
      },
    ]);
  });

  it('warns about artboard classes', async () => {
    const doc = docWith([]);
    setArtboardClass(doc, 'bg-whte');
    expect(await engine.classDiagnostics(doc)).toMatchObject([
      {
        message: 'Unknown class "bg-whte"',
        hint: 'Did you mean `bg-white`?',
        path: ['pages', 0, 'artboards', 0, 'class'],
        artboardId: 'board',
      },
    ]);
  });
});
