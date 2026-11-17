import { describe, expect, it } from 'vitest';
import { createDocument } from '../create';
import { findById } from '../query';
import { docWith } from '../test-fixtures';
import { deleteById } from './delete';
import { EditError } from './error';
import { createPage } from './page';

describe('deleteById', () => {
  const doc = docWith([
    { type: 'frame', id: 'outer', children: [{ type: 'text', id: 'inner', text: '' }] },
  ]);

  it('deletes a nested node', () => {
    const result = deleteById(doc, 'inner');
    expect(findById(result, 'inner')).toBeUndefined();
    expect(findById(doc, 'inner')).toBeDefined();
  });

  it('deletes an artboard with its nodes', () => {
    const result = deleteById(doc, 'board');
    expect(result.pages[0]?.artboards).toEqual([]);
  });

  it('deletes a page when another remains', () => {
    const { document } = createPage(createDocument(), { name: 'Two', id: 'two' });
    expect(deleteById(document, 'page-1').pages.map((page) => page.id)).toEqual(['two']);
  });

  it('refuses to delete the last page or an unknown id', () => {
    expect(() => deleteById(doc, 'page')).toThrow(
      new EditError(
        'Can\'t delete "page", the only page. A design needs at least one page; add another page first.',
      ),
    );
    expect(() => deleteById(doc, 'zzz')).toThrow('No page, artboard or node has id "zzz".');
  });
});
