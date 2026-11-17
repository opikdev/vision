import { describe, expect, it } from 'vitest';
import { parseDocument } from './parse';

const valid = `{
  "format": "vision",
  "version": 1,
  "pages": [
    {
      "id": "checkout",
      "name": "Checkout",
      "artboards": [
        {
          "id": "cart",
          "name": "Cart",
          "x": 0,
          "y": 0,
          "width": 1440,
          "height": 900,
          "children": [
            { "type": "text", "id": "title", "text": "Your cart" }
          ]
        }
      ]
    }
  ]
}
`;

function errorsOf(text: string) {
  const result = parseDocument(text);
  expect(result.ok).toBe(false);
  return result.diagnostics;
}

describe('parseDocument', () => {
  it('parses a valid document', () => {
    const result = parseDocument(valid);
    expect(result).toMatchObject({ ok: true, diagnostics: [] });
    expect(result.ok && result.document.pages[0]?.artboards[0]?.children[0]).toEqual({
      type: 'text',
      id: 'title',
      text: 'Your cart',
    });
  });

  it('reports a JSON syntax error with its line and column', () => {
    const text = valid.replace('"name": "Cart",', '"name": "Cart"');
    expect(errorsOf(text)).toEqual([
      {
        severity: 'error',
        code: 'json-syntax',
        message: 'Expected ","',
        path: [],
        line: 12,
        column: 11,
      },
    ]);
  });

  it('explains a trailing comma', () => {
    expect(errorsOf('{\n  "format": "vision",\n}\n')).toEqual([
      {
        severity: 'error',
        code: 'json-syntax',
        message: 'Trailing comma',
        hint: 'Remove the comma before the closing bracket.',
        path: [],
        line: 2,
        column: 21,
      },
    ]);
  });

  it('rejects comments and empty files', () => {
    expect(errorsOf('// hi\n{}')[0]?.message).toBe("Comments aren't allowed in JSON");
    expect(errorsOf('')[0]?.message).toBe('Expected a value');
  });

  it('reports a missing field at a nested path with the line of its object', () => {
    const text = valid.replace(', "text": "Your cart"', '');
    expect(errorsOf(text)).toEqual([
      {
        severity: 'error',
        code: 'schema',
        message: 'Missing field "text"',
        hint: 'Add "text" (a string).',
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'text'],
        line: 17,
        column: 13,
        pageId: 'checkout',
        artboardId: 'cart',
        nodeId: 'title',
      },
    ]);
  });

  it('reports a wrong type, a bad literal and out-of-range sizes', () => {
    const text = valid
      .replace('"version": 1', '"version": 2')
      .replace('"x": 0', '"x": "0"')
      .replace('"width": 1440', '"width": 0');
    expect(errorsOf(text).map((d) => [d.message, d.path.join('.'), d.line])).toEqual([
      ['"version" must be 1', 'version', 3],
      ['"x" must be a number, not a string', 'pages.0.artboards.0.x', 12],
      ['"width" must be at least 1, not 0', 'pages.0.artboards.0.width', 14],
    ]);
  });

  it('reports an unknown field at the key with a suggestion', () => {
    const text = valid.replace('"text": "Your cart"', '"text": "Your cart", "clas": "p-4"');
    expect(errorsOf(text)).toEqual([
      {
        severity: 'error',
        code: 'schema',
        message: 'Unknown field "clas"',
        hint: 'Did you mean "class"?',
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'clas'],
        line: 17,
        column: 67,
        pageId: 'checkout',
        artboardId: 'cart',
        nodeId: 'title',
      },
    ]);
  });

  it('lists allowed fields when an unknown field has no close match', () => {
    const text = valid.replace('"version": 1,', '"version": 1, "zzzzzz": true,');
    expect(errorsOf(text)[0]?.hint).toBe(
      'Remove it. Allowed fields here: format, version, tokens, pages.',
    );
  });

  it('reports an unknown node type', () => {
    const text = valid.replace('"type": "text"', '"type": "box"');
    expect(errorsOf(text)[0]).toMatchObject({
      message: 'Unknown node type "box"',
      hint: 'Use "frame", "text", "image" or "svg".',
      path: ['pages', 0, 'artboards', 0, 'children', 0, 'type'],
      line: 17,
    });
  });

  it('requires at least one page', () => {
    expect(errorsOf('{ "format": "vision", "version": 1, "pages": [] }')[0]?.message).toBe(
      '"pages" needs at least 1 item',
    );
  });

  it('adds line numbers to validation errors and fails on them', () => {
    const text = valid.replace('"id": "title"', '"id": "cart"');
    expect(errorsOf(text)).toEqual([
      {
        severity: 'error',
        code: 'duplicate-id',
        message: 'Duplicate id "cart", already used by the artboard at pages.0.artboards.0',
        hint: 'Ids are unique across pages, artboards and nodes. Rename one of them.',
        path: ['pages', 0, 'artboards', 0, 'children', 0, 'id'],
        line: 17,
        column: 31,
        pageId: 'checkout',
        artboardId: 'cart',
        nodeId: 'cart',
      },
    ]);
  });

  it('stays ok with warnings only', () => {
    const doc = JSON.parse(valid) as { pages: { artboards: object[] }[] };
    doc.pages[0]?.artboards.push({
      id: 'b',
      name: 'B',
      x: 10,
      y: 10,
      width: 10,
      height: 10,
      children: [],
    });
    const result = parseDocument(JSON.stringify(doc));
    expect(result.ok).toBe(true);
    expect(result.diagnostics.map((d) => d.code)).toEqual(['artboard-overlap']);
  });

  it('reports a __proto__ field as unknown', () => {
    const text = valid.replace('"version": 1,', '"version": 1, "__proto__": {},');
    expect(errorsOf(text)[0]?.message).toBe('Unknown field "__proto__"');
  });

  it('ignores a byte order mark', () => {
    expect(parseDocument(`\uFEFF${valid}`).ok).toBe(true);
  });
});
