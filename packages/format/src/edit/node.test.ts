import { describe, expect, it } from 'vitest';
import { findById } from '../query';
import type { VisionDocument } from '../schema';
import { docWith } from '../test-fixtures';
import { EditError } from './error';
import { insertHtml, moveNode, updateNode } from './node';

const base = docWith([
  {
    type: 'frame',
    id: 'list',
    children: [
      { type: 'text', id: 'one', text: '1' },
      { type: 'text', id: 'two', text: '2' },
    ],
  },
  { type: 'image', id: 'photo', src: 'a.png', alt: 'A', name: 'Photo' },
  { type: 'svg', id: 'icon', svg: '<svg></svg>' },
]);

function childIds(doc: VisionDocument, id: string): string[] {
  const located = findById(doc, id);
  if (located?.kind === 'artboard') return located.artboard.children.map((node) => node.id);
  if (located?.kind === 'node' && located.node.type === 'frame') {
    return (located.node.children ?? []).map((node) => node.id);
  }
  throw new Error(`${id} is not a container`);
}

describe('insertHtml', () => {
  it('appends by default and returns the top-level ids', () => {
    const { document, ids } = insertHtml(base, {
      parent: 'list',
      html: '<p>3</p><div><p>4</p></div>',
    });
    expect(ids).toEqual(['p-1', 'div-1']);
    expect(childIds(document, 'list')).toEqual(['one', 'two', 'p-1', 'div-1']);
    expect(childIds(base, 'list')).toEqual(['one', 'two']);
  });

  it('inserts at an index', () => {
    const { document } = insertHtml(base, {
      parent: 'board',
      html: '<p id="first">0</p>',
      index: 0,
    });
    expect(childIds(document, 'board')).toEqual(['first', 'list', 'photo', 'icon']);
  });

  it('replaces children and may reuse their ids', () => {
    const { document, ids } = insertHtml(base, {
      parent: 'list',
      html: '<p id="one">uno</p>',
      replace: true,
    });
    expect(ids).toEqual(['one']);
    expect(childIds(document, 'list')).toEqual(['one']);
    expect(
      insertHtml(base, { parent: 'list', html: '', replace: true }).document.pages[0]?.artboards[0]
        ?.children[0],
    ).toEqual({
      type: 'frame',
      id: 'list',
    });
  });

  it('rejects bad parents, indexes and HTML', () => {
    expect(() => insertHtml(base, { parent: 'one', html: '<p>x</p>' })).toThrow(
      new EditError('The parent "one" is a text node. Use an artboard or frame id.'),
    );
    expect(() => insertHtml(base, { parent: 'page', html: '<p>x</p>' })).toThrow(
      'The parent "page" is a page. Use an artboard or frame id.',
    );
    expect(() => insertHtml(base, { parent: 'list', html: '<p>x</p>', index: 3 })).toThrow(
      'index must be a whole number from 0 to 2, not 3.',
    );
    expect(() =>
      insertHtml(base, { parent: 'list', html: '<p>x</p>', index: 0, replace: true }),
    ).toThrow('Pass either index or replace, not both.');
    expect(() => insertHtml(base, { parent: 'list', html: ' ' })).toThrow(
      'The HTML has no elements or text to insert.',
    );
    expect(() => insertHtml(base, { parent: 'list', html: '<p id="photo">x</p>' })).toThrow(
      new EditError(
        'The id "photo" is already used in the document. Choose another id or leave it out.',
      ),
    );
  });
});

describe('updateNode', () => {
  it('sets fields that fit the node type', () => {
    const doc = updateNode(base, 'one', { text: 'Uno', class: 'font-bold', name: 'First' });
    expect(findById(doc, 'one')).toMatchObject({
      node: { type: 'text', id: 'one', name: 'First', class: 'font-bold', text: 'Uno' },
    });
    expect(findById(base, 'one')).toMatchObject({ node: { text: '1' } });
  });

  it('clears optional fields with null', () => {
    const doc = updateNode(base, 'photo', { alt: null, name: null, src: 'b.png' });
    const located = findById(doc, 'photo');
    expect(located?.kind === 'node' ? located.node : undefined).toEqual({
      type: 'image',
      id: 'photo',
      src: 'b.png',
    });
  });

  it('sanitizes svg markup', () => {
    const doc = updateNode(base, 'icon', { svg: '<svg onload="x()"><path d="M0 0"/></svg>' });
    const located = findById(doc, 'icon');
    expect(located?.kind === 'node' ? located.node : undefined).toEqual({
      type: 'svg',
      id: 'icon',
      svg: '<svg><path d="M0 0"></path></svg>',
    });
  });

  it('rejects fields that do not fit, required clears and non-nodes', () => {
    expect(() => updateNode(base, 'one', { src: 'x.png' })).toThrow(
      new EditError(
        'A text node has no "src". Fields you can set on a text node: name, class, text.',
      ),
    );
    expect(() => updateNode(base, 'list', { text: 'x' })).toThrow('A frame node has no "text".');
    expect(() => updateNode(base, 'one', { text: null })).toThrow(
      '"text" is required on a text node, so it can\'t be cleared. Pass a new value.',
    );
    expect(() => updateNode(base, 'icon', { svg: '<div></div>' })).toThrow(
      'Expected a single <svg> element, got <div>.',
    );
    expect(() => updateNode(base, 'board', { class: 'x' })).toThrow(
      '"board" is an artboard, not a node. Use updateArtboard for artboards.',
    );
  });
});

describe('moveNode', () => {
  it('moves a node to another parent at an index', () => {
    const doc = moveNode(base, 'photo', { parent: 'list', index: 1 });
    expect(childIds(doc, 'list')).toEqual(['one', 'photo', 'two']);
    expect(childIds(doc, 'board')).toEqual(['list', 'icon']);
  });

  it('reorders within the same parent, with the index in the final order', () => {
    expect(childIds(moveNode(base, 'one', { parent: 'list', index: 1 }), 'list')).toEqual([
      'two',
      'one',
    ]);
    expect(childIds(moveNode(base, 'two', { parent: 'list', index: 0 }), 'list')).toEqual([
      'two',
      'one',
    ]);
  });

  it('removes the children field of a frame it empties', () => {
    const doc = moveNode(moveNode(base, 'one', { parent: 'board' }), 'two', { parent: 'board' });
    expect(findById(doc, 'list')).toMatchObject({ node: { type: 'frame', id: 'list' } });
    const located = findById(doc, 'list');
    expect(located?.kind === 'node' && 'children' in located.node).toBe(false);
  });

  it('rejects moving into itself, a descendant or a non-container', () => {
    const nested = insertHtml(base, { parent: 'list', html: '<div id="inner"></div>' }).document;
    expect(() => moveNode(nested, 'list', { parent: 'inner' })).toThrow(
      new EditError(
        'Can\'t move "list" into itself or one of its descendants. Choose a parent outside it.',
      ),
    );
    expect(() => moveNode(nested, 'list', { parent: 'list' })).toThrow('into itself');
    expect(() => moveNode(base, 'photo', { parent: 'one' })).toThrow(
      'The parent "one" is a text node.',
    );
    expect(() => moveNode(base, 'board', { parent: 'list' })).toThrow(
      '"board" is an artboard; only nodes can be moved.',
    );
    expect(() => moveNode(base, 'photo', { parent: 'list', index: 5 })).toThrow(
      'index must be a whole number from 0 to 2, not 5.',
    );
  });
});
