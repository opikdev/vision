// @vitest-environment happy-dom
import type { Page } from '@vision/format';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '../../test/render';
import { useLayerStore } from './layer-store';
import { LayerTree } from './LayerTree';

const page: Page = {
  id: 'checkout',
  name: 'Checkout',
  artboards: [
    {
      id: 'cart',
      name: 'Cart',
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      children: [
        {
          type: 'frame',
          id: 'cart-summary',
          children: [
            { type: 'text', id: 'h2-2', text: 'Order summary' },
            { type: 'svg', id: 'svg-1', svg: '<svg></svg>' },
            { type: 'text', id: 'span-1', text: 'Total' },
          ],
        },
        { type: 'image', id: 'img-1', src: 'photos/hero.jpg' },
      ],
    },
    { id: 'payment', name: 'Payment', x: 1500, y: 0, width: 1440, height: 900, children: [] },
  ],
};

let container: HTMLElement;

beforeEach(async () => {
  useLayerStore.setState({ selection: null, hovered: null, expanded: new Set(), revealed: 0 });
  container = await render(<LayerTree page={page} artboardMeta={(artboard) => artboard.width} />);
});

afterEach(cleanup);

function rows(): string[] {
  return Array.from(container.querySelectorAll('[role="treeitem"]'), (row) => {
    const state = [
      `level ${row.getAttribute('aria-level') ?? ''}`,
      row.getAttribute('aria-expanded') === null
        ? ''
        : `expanded ${row.getAttribute('aria-expanded') ?? ''}`,
      row.getAttribute('aria-selected') === 'true' ? 'selected' : '',
      row.getAttribute('tabindex') === '0' ? 'tab stop' : '',
      row === document.activeElement ? 'focused' : '',
    ].filter((part) => part !== '');
    return `${row.textContent} (${state.join(', ')})`;
  });
}

function press(key: string): void {
  const target = document.activeElement ?? container;
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function focusFirst(): void {
  act(() => {
    container.querySelector<HTMLElement>('[role="treeitem"]')?.focus();
  });
}

describe('LayerTree', () => {
  it('shows artboards with their size and only expanded rows', () => {
    expect(container.querySelector('[role="tree"]')?.getAttribute('aria-label')).toBe('Layers');
    expect(rows()).toEqual([
      'Cart1440 (level 1, expanded false, tab stop)',
      'Payment1440 (level 1)',
    ]);
  });

  it('moves with the arrows, expands and collapses, and selects with Enter and Space', () => {
    focusFirst();
    press('ArrowRight');
    expect(rows()).toEqual([
      'Cart1440 (level 1, expanded true, tab stop, focused)',
      'Cart summary (level 2, expanded false)',
      'hero.jpg (level 2)',
      'Payment1440 (level 1)',
    ]);
    press('ArrowRight');
    press('ArrowRight');
    press('ArrowRight');
    expect(rows()).toEqual([
      'Cart1440 (level 1, expanded true)',
      'Cart summary (level 2, expanded true)',
      'Order summary (level 3, tab stop, focused)',
      'Icon (level 3)',
      'Total (level 3)',
      'hero.jpg (level 2)',
      'Payment1440 (level 1)',
    ]);
    press('Enter');
    expect(useLayerStore.getState().selection).toEqual({ pageId: 'checkout', id: 'h2-2' });
    press('ArrowDown');
    press(' ');
    expect(useLayerStore.getState().selection).toEqual({ pageId: 'checkout', id: 'svg-1' });
    press('ArrowLeft');
    expect(rows()[1]).toBe('Cart summary (level 2, expanded true, tab stop, focused)');
    press('ArrowLeft');
    expect(rows()[1]).toBe('Cart summary (level 2, expanded false, tab stop, focused)');
    press('ArrowUp');
    expect(rows()[0]).toBe('Cart1440 (level 1, expanded true, tab stop, focused)');
    press('End');
    expect(rows().at(-1)).toBe('Payment1440 (level 1, tab stop, focused)');
    press('ArrowDown');
    expect(rows().at(-1)).toBe('Payment1440 (level 1, tab stop, focused)');
    press('Home');
    expect(rows()[0]).toBe('Cart1440 (level 1, expanded true, tab stop, focused)');
    press('ArrowLeft');
    expect(rows()).toEqual([
      'Cart1440 (level 1, expanded false, tab stop, focused)',
      'Payment1440 (level 1)',
    ]);
  });

  it('selects a row on click and toggles it from its chevron without selecting', () => {
    const cart = container.querySelector<HTMLElement>('[data-layer-id="cart"]');
    act(() => {
      cart?.querySelector('span')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(useLayerStore.getState().selection).toBeNull();
    expect(rows()).toHaveLength(4);
    act(() => {
      container
        .querySelector('[data-layer-id="img-1"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(rows()[2]).toBe('hero.jpg (level 2, selected, tab stop)');
  });
});
