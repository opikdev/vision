import { describe, expect, it } from 'vitest';
import { collectClasses, findById, outline } from './query';
import { docWith } from './test-fixtures';

const doc = docWith([
  {
    type: 'frame',
    id: 'header',
    name: 'Header',
    class: 'flex  items-center\tgap-4',
    children: [
      {
        type: 'text',
        id: 'title',
        class: 'text-2xl flex',
        text: 'A very long heading that keeps going well past sixty characters',
      },
      { type: 'image', id: 'logo', src: 'logo.png', alt: 'Logo' },
    ],
  },
  { type: 'svg', id: 'icon', class: 'size-4', svg: '<svg></svg>' },
]);

describe('findById', () => {
  it('finds pages, artboards and nested nodes with their parents', () => {
    expect(findById(doc, 'page')).toMatchObject({ kind: 'page', index: 0, path: ['pages', 0] });
    expect(findById(doc, 'board')).toMatchObject({
      kind: 'artboard',
      index: 0,
      path: ['pages', 0, 'artboards', 0],
    });
    const logo = findById(doc, 'logo');
    expect(logo).toMatchObject({
      kind: 'node',
      index: 1,
      path: ['pages', 0, 'artboards', 0, 'children', 0, 'children', 1],
      node: { id: 'logo' },
      parent: { id: 'header' },
      artboard: { id: 'board' },
      page: { id: 'page' },
    });
    expect(findById(doc, 'missing')).toBeUndefined();
  });
});

describe('outline', () => {
  it('outlines the whole document', () => {
    expect(outline(doc)).toBe(
      [
        'page page name="Page"',
        '  artboard board name="board" 400x300 at 0,0',
        '    frame header name="Header" class="flex  items-center\\tgap-4"',
        '      text title class="text-2xl flex" text="A very long heading that keeps going well past sixty charac…"',
        '      image logo src="logo.png" alt="Logo"',
        '    svg icon class="size-4"',
      ].join('\n'),
    );
  });

  it('outlines a subtree', () => {
    expect(outline(doc, 'header')).toBe(
      [
        'frame header name="Header" class="flex  items-center\\tgap-4"',
        '  text title class="text-2xl flex" text="A very long heading that keeps going well past sixty charac…"',
        '  image logo src="logo.png" alt="Logo"',
      ].join('\n'),
    );
  });

  it('throws for an unknown root', () => {
    expect(() => outline(doc, 'nope')).toThrow('No page, artboard or node has id "nope"');
  });
});

describe('collectClasses', () => {
  it('returns unique classes, sorted', () => {
    expect(collectClasses(doc)).toEqual(['flex', 'gap-4', 'items-center', 'size-4', 'text-2xl']);
  });
});
