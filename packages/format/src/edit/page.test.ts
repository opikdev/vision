import { describe, expect, it } from 'vitest';
import { createDocument } from '../create';
import { EditError } from './error';
import { createPage } from './page';

describe('createPage', () => {
  it('appends a page with an id made from its name', () => {
    const doc = createDocument();
    const { document, page } = createPage(doc, { name: 'Checkout flow' });
    expect(page).toEqual({ id: 'checkout-flow-1', name: 'Checkout flow', artboards: [] });
    expect(document.pages.map((p) => p.id)).toEqual(['page-1', 'checkout-flow-1']);
    expect(doc.pages).toHaveLength(1);
  });

  it('uses a given id', () => {
    expect(createPage(createDocument(), { name: 'A', id: 'a' }).page.id).toBe('a');
  });

  it('rejects a taken or malformed id', () => {
    expect(() => createPage(createDocument(), { name: 'A', id: 'desktop' })).toThrow(
      new EditError('The id "desktop" is already used. Choose another id or leave it out.'),
    );
    expect(() => createPage(createDocument(), { name: 'A', id: 'a/b' })).toThrow(
      'Invalid id "a/b". Ids may only contain letters, digits, "-" and "_", such as "pay-button".',
    );
  });
});
