import { describe, expect, it } from 'vitest';
import { createDocument } from '../create';
import type { VisionDocument } from '../schema';
import { createArtboard, updateArtboard } from './artboard';
import { EditError } from './error';

describe('createArtboard', () => {
  it('places a new artboard right of the right-most one, top-aligned with the first', () => {
    const start = createDocument();
    const moved = updateArtboard(start, 'desktop', { y: 40 });
    const { document, artboard } = createArtboard(moved, {
      name: 'Cart, mobile',
      width: 390,
      height: 844,
    });
    expect(artboard).toEqual({
      id: 'cart-mobile-1',
      name: 'Cart, mobile',
      x: 1520,
      y: 40,
      width: 390,
      height: 844,
      children: [],
    });
    const third = createArtboard(document, {
      name: 'Payment',
      width: 1440,
      height: 900,
      class: 'bg-surface',
    });
    expect(third.artboard).toMatchObject({ x: 1990, y: 40, class: 'bg-surface' });
    expect(start.pages[0]?.artboards).toHaveLength(1);
  });

  it('uses explicit position, id and page', () => {
    const withPage: VisionDocument = {
      ...createDocument(),
      pages: [...createDocument().pages, { id: 'second', name: 'Second', artboards: [] }],
    };
    const { document, artboard } = createArtboard(withPage, {
      page: 'second',
      name: 'A',
      id: 'a',
      width: 10,
      height: 20,
      x: -5,
      y: 7,
    });
    expect(artboard).toEqual({
      id: 'a',
      name: 'A',
      x: -5,
      y: 7,
      width: 10,
      height: 20,
      children: [],
    });
    expect(document.pages[1]?.artboards).toEqual([artboard]);
  });

  it('starts at the origin on an empty page', () => {
    const doc: VisionDocument = {
      ...createDocument(),
      pages: [{ id: 'p', name: 'P', artboards: [] }],
    };
    expect(createArtboard(doc, { name: 'A', width: 10, height: 10 }).artboard).toMatchObject({
      x: 0,
      y: 0,
    });
  });

  it('creates "Page 1" when there are no pages', () => {
    const doc: VisionDocument = { ...createDocument(), pages: [] };
    const { document } = createArtboard(doc, { name: 'A', width: 10, height: 10 });
    expect(document.pages.map((page) => [page.id, page.name])).toEqual([['page-1', 'Page 1']]);
  });

  it('rejects bad input', () => {
    const doc = createDocument();
    expect(() => createArtboard(doc, { name: 'A', width: 0, height: 10 })).toThrow(
      new EditError('width must be a number from 1 to 10000, not 0.'),
    );
    expect(() => createArtboard(doc, { name: 'A', width: 10, height: 10001 })).toThrow(
      'height must be a number from 1 to 10000, not 10001.',
    );
    expect(() => createArtboard(doc, { name: 'A', width: 10, height: 10, x: Number.NaN })).toThrow(
      'x must be a finite number, not NaN.',
    );
    expect(() =>
      createArtboard(doc, { page: 'desktop', name: 'A', width: 10, height: 10 }),
    ).toThrow('"desktop" is an artboard, not a page. Pass a page id.');
    expect(() => createArtboard(doc, { page: 'page-2', name: 'A', width: 10, height: 10 })).toThrow(
      'No page, artboard or node has id "page-2". Did you mean "page-1"?',
    );
  });
});

describe('updateArtboard', () => {
  it('patches fields and clears class with null', () => {
    const doc = updateArtboard(createDocument(), 'desktop', {
      name: 'Home',
      x: 10,
      width: 800,
      class: null,
    });
    expect(doc.pages[0]?.artboards[0]).toEqual({
      id: 'desktop',
      name: 'Home',
      x: 10,
      y: 0,
      width: 800,
      height: 900,
      children: [],
    });
    expect(
      updateArtboard(doc, 'desktop', { class: 'bg-surface' }).pages[0]?.artboards[0]?.class,
    ).toBe('bg-surface');
  });

  it('rejects a non-artboard id and bad sizes', () => {
    expect(() => updateArtboard(createDocument(), 'page-1', { x: 1 })).toThrow(
      '"page-1" is a page, not an artboard. Pass an artboard id.',
    );
    expect(() => updateArtboard(createDocument(), 'desktop', { height: -1 })).toThrow(
      'height must be a number from 1 to 10000, not -1.',
    );
  });
});
