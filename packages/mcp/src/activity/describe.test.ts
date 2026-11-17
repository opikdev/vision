import type { VisionDocument } from '@vision/format';
import { describe, expect, it } from 'vitest';
import { describeEdit, describeReading, describeReview, describeScreenshot } from './describe';

const cart = {
  id: 'cart',
  name: 'Cart',
  x: 0,
  y: 0,
  width: 1440,
  height: 900,
  children: [
    {
      type: 'frame' as const,
      id: 'summary',
      children: [{ type: 'text' as const, id: 'total', text: '$77' }],
    },
  ],
};

const before: VisionDocument = {
  format: 'vision',
  version: 1,
  pages: [{ id: 'shop', name: 'Shop', artboards: [cart] }],
};

function withCart(children: VisionDocument['pages'][number]['artboards'][number]['children']) {
  return { ...before, pages: [{ id: 'shop', name: 'Shop', artboards: [{ ...cart, children }] }] };
}

describe('describeEdit', () => {
  it('names the elements added and lists them in document order', () => {
    const after = withCart([
      {
        type: 'frame',
        id: 'summary',
        children: [
          { type: 'text', id: 'total', text: '$77' },
          { type: 'frame', id: 'pay', children: [{ type: 'text', id: 'pay-label', text: 'Pay' }] },
        ],
      },
      { type: 'text', id: 'note', text: 'Free shipping' },
    ]);
    expect(describeEdit(before, after)).toEqual({
      kind: 'edit',
      artboard: 'cart',
      nodes: ['pay', 'pay-label', 'note'],
      summary: 'is adding 3 elements to Cart',
    });
  });

  it('describes changed elements', () => {
    const after = withCart([
      {
        type: 'frame',
        id: 'summary',
        class: 'p-6',
        children: [{ type: 'text', id: 'total', text: '$80' }],
      },
    ]);
    expect(describeEdit(before, after)).toEqual({
      kind: 'edit',
      artboard: 'cart',
      nodes: ['summary', 'total'],
      summary: 'is editing 2 elements in Cart',
    });
  });

  it('points at the parent of removed elements', () => {
    expect(
      describeEdit(before, withCart([{ type: 'frame', id: 'summary', children: [] }])),
    ).toEqual({
      kind: 'edit',
      artboard: 'cart',
      nodes: ['summary'],
      summary: 'is removing 1 element from Cart',
    });
    expect(describeEdit(before, withCart([]))).toEqual({
      kind: 'edit',
      artboard: 'cart',
      nodes: [],
      summary: 'is removing 2 elements from Cart',
    });
  });

  it('describes artboards, pages and tokens', () => {
    const mobile = { ...cart, id: 'mobile', name: 'Cart, mobile', children: [] };
    const twoBoards = {
      ...before,
      pages: [{ id: 'shop', name: 'Shop', artboards: [cart, mobile] }],
    };
    expect(describeEdit(before, twoBoards)).toEqual({
      kind: 'edit',
      artboard: 'mobile',
      nodes: [],
      summary: 'is adding the artboard Cart, mobile',
    });
    expect(describeEdit(twoBoards, before)).toEqual({
      kind: 'edit',
      nodes: [],
      summary: 'is removing the artboard Cart, mobile',
    });
    const resized = {
      ...before,
      pages: [{ id: 'shop', name: 'Shop', artboards: [{ ...cart, width: 1280 }] }],
    };
    expect(describeEdit(before, resized).summary).toBe('is editing the artboard Cart');
    const twoPages = {
      ...before,
      pages: [...before.pages, { id: 'more', name: 'More', artboards: [] }],
    };
    expect(describeEdit(before, twoPages).summary).toBe('is adding the page More');
    expect(describeEdit(twoPages, before).summary).toBe('is removing the page More');
    expect(describeEdit(before, { ...before, tokens: { color: { brand: '#1F3D2B' } } })).toEqual({
      kind: 'edit',
      nodes: [],
      summary: 'is updating tokens',
    });
    expect(describeEdit(before, structuredClone(before)).summary).toBe('is editing the design');
  });

  it('caps the node list at 500 ids', () => {
    const many = Array.from({ length: 600 }, (_, index) => ({
      type: 'text' as const,
      id: `n${index}`,
      text: 'x',
    }));
    const activity = describeEdit(before, withCart(many));
    expect(activity.nodes).toHaveLength(500);
    expect(activity.nodes.at(-1)).toBe('n499');
    expect(activity.summary).toBe('is adding 600 elements to Cart');
  });
});

describe('describeReading, describeScreenshot and describeReview', () => {
  it('say what the agent looks at', () => {
    expect(describeReading()).toEqual({ kind: 'look', summary: 'is reading the design' });
    expect(describeScreenshot(cart)).toEqual({
      kind: 'look',
      artboard: 'cart',
      summary: 'is taking a screenshot of Cart',
    });
    expect(describeReview(cart)).toEqual({
      kind: 'look',
      artboard: 'cart',
      summary: 'is reviewing Cart',
    });
    expect(describeReview(undefined)).toEqual({ kind: 'look', summary: 'is reviewing the design' });
  });
});
