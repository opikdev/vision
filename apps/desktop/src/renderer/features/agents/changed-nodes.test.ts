import type { Artboard, VisionDocument } from '@vision/format';
import { describe, expect, it } from 'vitest';
import { changedNodes } from './changed-nodes';

function artboard(id: string, texts: string[]): Artboard {
  return {
    id,
    name: id,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    children: texts.map((text, index) => ({ type: 'text', id: `${id}-${index}`, text })),
  };
}

function design(...artboards: Artboard[]): VisionDocument {
  return { format: 'vision', version: 1, pages: [{ id: 'page', name: 'Page', artboards }] };
}

const ids = (before: VisionDocument, after: VisionDocument) =>
  changedNodes(before, after).map(({ change, located }) => [
    change,
    located.kind === 'node' ? located.node.id : '',
  ]);

describe('changedNodes', () => {
  it('reports added and changed nodes of the artboards that changed', () => {
    const kept = artboard('a', ['One']);
    expect(
      ids(design(kept, artboard('b', ['Two'])), design(kept, artboard('b', ['2', 'Three']))),
    ).toEqual([
      ['changed', 'b-0'],
      ['added', 'b-1'],
    ]);
  });

  it('reports a node that moved into another artboard', () => {
    const before = design(artboard('a', ['One']), { ...artboard('b', []), children: [] });
    const moved = before.pages[0]?.artboards[0]?.children[0];
    const after = design(
      { ...artboard('a', []), children: [] },
      { ...artboard('b', []), children: moved === undefined ? [] : [moved] },
    );
    expect(ids(before, after)).toEqual([['changed', 'a-0']]);
  });

  it('reports nothing when every artboard is the same object', () => {
    const a = artboard('a', ['One']);
    expect(ids(design(a), design(a))).toEqual([]);
  });
});
