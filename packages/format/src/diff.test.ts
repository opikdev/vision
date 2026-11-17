import { describe, expect, it } from 'vitest';
import { diffDocuments, type DocumentDiff } from './diff';
import { idOf } from './query';
import type { VisionDocument } from './schema';
import { artboard, docWith } from './test-fixtures';

function summary(diff: DocumentDiff) {
  return {
    touched: diff.touched.map(
      ({ change, located }) => `${change} ${located.kind} ${idOf(located)}`,
    ),
    removed: diff.removed.map((located) => `${located.kind} ${idOf(located)}`),
  };
}

const before = docWith([
  {
    type: 'frame',
    id: 'card',
    class: 'p-4',
    children: [
      { type: 'text', id: 'title', text: 'Plan' },
      { type: 'image', id: 'photo', src: 'a.png' },
    ],
  },
  { type: 'svg', id: 'icon', svg: '<svg></svg>' },
]);

describe('diffDocuments', () => {
  it('finds nothing between equal documents', () => {
    expect(summary(diffDocuments(before, structuredClone(before)))).toEqual({
      touched: [],
      removed: [],
    });
  });

  it('lists added and changed nodes in document order', () => {
    const after = docWith([
      { type: 'text', id: 'intro', text: 'Hi' },
      {
        type: 'frame',
        id: 'card',
        class: 'p-6',
        children: [
          { type: 'text', id: 'title', text: 'Plan', name: 'Renamed only' },
          { type: 'frame', id: 'row', children: [{ type: 'text', id: 'price', text: '$5' }] },
          { type: 'image', id: 'photo', src: 'a.png', alt: 'A cup' },
        ],
      },
      { type: 'svg', id: 'icon', svg: '<svg><path d="M0 0"/></svg>' },
    ]);
    expect(summary(diffDocuments(before, after))).toEqual({
      touched: [
        'added node intro',
        'changed node card',
        'added node row',
        'added node price',
        'changed node photo',
        'changed node icon',
      ],
      removed: [],
    });
  });

  it('counts a node moved to another parent as changed and lists removed ids', () => {
    const after = docWith([
      {
        type: 'frame',
        id: 'card',
        class: 'p-4',
        children: [{ type: 'svg', id: 'icon', svg: '<svg></svg>' }],
      },
    ]);
    expect(summary(diffDocuments(before, after))).toEqual({
      touched: ['changed node icon'],
      removed: ['node title', 'node photo'],
    });
  });

  it('reports pages and artboards', () => {
    const after: VisionDocument = {
      ...before,
      pages: [
        {
          id: 'page',
          name: 'Home',
          artboards: [
            artboard('board', {
              width: 800,
              children: before.pages[0]?.artboards[0]?.children ?? [],
            }),
          ],
        },
        { id: 'more', name: 'More', artboards: [artboard('mobile')] },
      ],
    };
    expect(summary(diffDocuments(before, after))).toEqual({
      touched: [
        'changed page page',
        'changed artboard board',
        'added page more',
        'added artboard mobile',
      ],
      removed: [],
    });
  });
});
