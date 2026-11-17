import { beforeAll, describe, expect, it } from 'vitest';
import { loadTailwindStylesheets } from './node/tailwind';
import { createTailwindEngine, type TailwindEngine } from './tailwind';
import type { VisionDocument } from './schema';
import { docWith } from './test-fixtures';

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

  it('starts fresh for each document', async () => {
    await engine.css(docWith([{ type: 'frame', id: 'a', class: 'grid' }]));
    const css = await engine.css(docWith([{ type: 'frame', id: 'a', class: 'flex' }]));
    expect(css).toContain('.flex {');
    expect(css).not.toContain('.grid {');
  });
});

describe('classDiagnostics', () => {
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
