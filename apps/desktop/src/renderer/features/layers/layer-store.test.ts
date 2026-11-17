import type { Page } from '@vision/format';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLayerStore } from './layer-store';

function cart(children: Page['artboards'][number]['children']): Page {
  return {
    id: 'checkout',
    name: 'Checkout',
    artboards: [{ id: 'cart', name: 'Cart', x: 0, y: 0, width: 1440, height: 900, children }],
  };
}

const summary = cart([
  {
    type: 'frame',
    id: 'summary',
    children: [
      { type: 'frame', id: 'row', children: [{ type: 'text', id: 'total', text: 'Total' }] },
    ],
  },
]);

beforeEach(() => {
  useLayerStore.setState({ selection: null, hovered: null, expanded: new Set(), revealed: 0 });
});

describe('useLayerStore', () => {
  it('keeps the selection across a redraw while the layer exists', () => {
    useLayerStore.getState().select({ pageId: 'checkout', id: 'total' });
    useLayerStore.getState().sync(structuredClone(summary));
    expect(useLayerStore.getState().selection).toEqual({ pageId: 'checkout', id: 'total' });
  });

  it('clears the selection and hover when the layer is removed', () => {
    useLayerStore.getState().select({ pageId: 'checkout', id: 'total' });
    useLayerStore.getState().hover('row');
    useLayerStore.getState().sync(cart([{ type: 'frame', id: 'summary' }]));
    expect(useLayerStore.getState()).toMatchObject({ selection: null, hovered: null });
  });

  it('clears the selection when another page is shown', () => {
    useLayerStore.getState().select({ pageId: 'checkout', id: 'cart' });
    useLayerStore.getState().sync({ ...summary, id: 'payment' });
    expect(useLayerStore.getState().selection).toBeNull();
  });

  it('reveals a layer by selecting it and expanding its ancestors', () => {
    useLayerStore.getState().setExpanded('other', true);
    useLayerStore.getState().reveal(summary, 'total');
    const { selection, expanded, revealed } = useLayerStore.getState();
    expect(selection).toEqual({ pageId: 'checkout', id: 'total' });
    expect([...expanded]).toEqual(['other', 'cart', 'summary', 'row']);
    expect(revealed).toBe(1);
  });

  it('ignores a reveal of a layer that is not on the page', () => {
    useLayerStore.getState().reveal(summary, 'missing');
    expect(useLayerStore.getState()).toMatchObject({ selection: null, revealed: 0 });
  });
});
