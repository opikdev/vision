import { describe, expect, it } from 'vitest';
import { artboard, docWith } from './test-fixtures';
import { validateDocument } from './validate';

describe('validateDocument', () => {
  it('accepts a clean document', () => {
    expect(validateDocument(docWith([{ type: 'text', id: 'title', text: 'Hi' }]))).toEqual([]);
  });

  it('reports malformed ids', () => {
    expect(validateDocument(docWith([{ type: 'frame', id: 'my box' }]))).toEqual([
      {
        severity: 'error',
        code: 'invalid-id',
        message: 'Invalid id "my box"',
        hint: 'Ids may only contain letters, digits, "-" and "_", such as "pay-button".',
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'id'],
        pageId: 'page',
        artboardId: 'board',
        nodeId: 'my box',
      },
    ]);
  });

  it('reports ids shared by a page and a nested node', () => {
    const doc = docWith([
      { type: 'frame', id: 'outer', children: [{ type: 'text', id: 'page', text: '' }] },
    ]);
    expect(validateDocument(doc)).toEqual([
      {
        severity: 'error',
        code: 'duplicate-id',
        message: 'Duplicate id "page", already used by the page at pages.0',
        hint: 'Ids are unique across pages, artboards and nodes. Rename one of them.',
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'children', 0, 'id'],
        pageId: 'page',
        artboardId: 'board',
        nodeId: 'page',
      },
    ]);
  });

  it('reports bad token names and values', () => {
    const doc = docWith([], {
      tokens: {
        color: { Brand: '#fff', ok: 'oklch(0.5 0.1 150)', bad: '#12', inject: 'red; } body {' },
        radius: { card: '12' },
        spacing: { gutter: '24px', none: '0' },
        font: { sans: '' },
      },
    });
    expect(validateDocument(doc).map((d) => [d.path.join('.'), d.message, d.hint])).toEqual([
      [
        'tokens.color.Brand',
        'Invalid token name "Brand" in color',
        'Token names use lowercase letters and digits separated by single dashes, such as "fg-muted".',
      ],
      [
        'tokens.color.bad',
        'Invalid value "#12" for token color.bad',
        'Use a CSS color, such as "#1F3D2B", "rgb(31 61 43)" or "oklch(0.4 0.05 150)".',
      ],
      [
        'tokens.color.inject',
        'Invalid value "red; } body {" for token color.inject',
        'Token values can\'t contain ";", "{", "}" or "/*".',
      ],
      ['tokens.font.sans', 'Invalid value "" for token font.sans', 'Give the token a CSS value.'],
      [
        'tokens.radius.card',
        'Invalid value "12" for token radius.card',
        'Use a CSS length with a unit, such as "12px" or "1.5rem".',
      ],
    ]);
    expect(
      validateDocument(doc).every((d) => d.code === 'invalid-token' && d.severity === 'error'),
    ).toBe(true);
  });

  it.each([
    ['photos/hero.jpg', undefined],
    ['https://example.com/a.png', undefined],
    [
      '../secret.png',
      'Paths can\'t leave the assets folder; remove ".." and use a path such as "photos/hero.jpg".',
    ],
    [
      'photos/../../x.png',
      'Paths can\'t leave the assets folder; remove ".." and use a path such as "photos/hero.jpg".',
    ],
    [
      '..\\x.png',
      'Paths can\'t leave the assets folder; remove ".." and use a path such as "photos/hero.jpg".',
    ],
    [
      '/etc/passwd',
      'Use a path relative to the assets folder, such as "photos/hero.jpg", not an absolute path.',
    ],
    [
      'http://example.com/a.png',
      'Use a path inside the assets folder, such as "photos/hero.jpg", or an https: URL.',
    ],
    [
      'file:///etc/passwd',
      'Use a path inside the assets folder, such as "photos/hero.jpg", or an https: URL.',
    ],
    [
      'C:\\x.png',
      'Use a path inside the assets folder, such as "photos/hero.jpg", or an https: URL.',
    ],
    ['', 'Set src to a path inside the assets folder, such as "photos/hero.jpg".'],
  ])('checks image src %j', (src, hint) => {
    const diagnostics = validateDocument(docWith([{ type: 'image', id: 'img', src }]));
    if (hint === undefined) {
      expect(diagnostics).toEqual([]);
      return;
    }
    expect(diagnostics).toEqual([
      {
        severity: 'error',
        code: 'asset-path',
        message: `Image src ${JSON.stringify(src)} is not inside the assets folder or an https: URL`,
        hint,
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'src'],
        pageId: 'page',
        artboardId: 'board',
        nodeId: 'img',
      },
    ]);
  });

  it('warns about overlapping artboards and suggests a free spot', () => {
    const doc = docWith([]);
    doc.pages[0]?.artboards.push(
      artboard('touching', { x: 400 }),
      artboard('overlap', { name: 'Overlap', x: 100, y: 50 }),
    );
    expect(validateDocument(doc)).toEqual([
      {
        severity: 'warning',
        code: 'artboard-overlap',
        message: 'Artboard "Overlap" overlaps "board"',
        hint: 'Move it to a free spot, such as x: 880, y: 50.',
        path: ['pages', 0, 'artboards', 2],
        pageId: 'page',
        artboardId: 'overlap',
      },
    ]);
  });
});
