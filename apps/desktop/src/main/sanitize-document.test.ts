import { createDocument, type Node, type VisionDocument } from '@vision/format';
import { describe, expect, it } from 'vitest';
import { sanitizeDocument } from './sanitize-document';

function docWith(children: Node[]): VisionDocument {
  const doc = createDocument();
  const [page] = doc.pages;
  if (page?.artboards[0] === undefined) throw new Error('createDocument changed shape');
  page.artboards[0].children = children;
  return doc;
}

describe('sanitizeDocument', () => {
  it('strips unsafe markup from nested svg nodes', () => {
    const doc = docWith([
      {
        type: 'frame',
        id: 'row',
        children: [
          {
            type: 'svg',
            id: 'icon',
            svg: '<svg viewBox="0 0 1 1" onload="x()"><script>x()</script><path d="M0 0"/></svg>',
          },
        ],
      },
    ]);
    expect(sanitizeDocument(doc)).toEqual(
      docWith([
        {
          type: 'frame',
          id: 'row',
          children: [
            { type: 'svg', id: 'icon', svg: '<svg viewBox="0 0 1 1"><path d="M0 0"></path></svg>' },
          ],
        },
      ]),
    );
  });

  it('blanks svg markup that is not a single svg element', () => {
    expect(sanitizeDocument(docWith([{ type: 'svg', id: 'bad', svg: '<div>hi</div>' }]))).toEqual(
      docWith([{ type: 'svg', id: 'bad', svg: '' }]),
    );
  });

  it('leaves the input untouched', () => {
    const doc = docWith([{ type: 'svg', id: 'icon', svg: '<svg onclick="x()"></svg>' }]);
    sanitizeDocument(doc);
    expect(doc.pages[0]?.artboards[0]?.children[0]).toEqual({
      type: 'svg',
      id: 'icon',
      svg: '<svg onclick="x()"></svg>',
    });
  });
});
