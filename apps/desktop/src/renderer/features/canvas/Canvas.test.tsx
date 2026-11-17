// @vitest-environment happy-dom
import { createDocument, type Artboard, type Page } from '@vision/format';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useViewStore } from '../../stores/view-store';
import { useLayerStore } from '../layers/layer-store';
import { render } from '../../test/render';
import { Canvas } from './Canvas';

const drawn = vi.hoisted(() => ({ count: 0 }));

vi.mock('../../design/ArtboardFrame', () => ({
  ArtboardFrame: ({ artboard }: { artboard: Artboard }) => {
    drawn.count++;
    return <i data-drawn={artboard.id} />;
  },
}));

function artboard(id: string, x: number): Artboard {
  return {
    id,
    name: id,
    x,
    y: 0,
    width: 100,
    height: 100,
    children: [{ type: 'text', id: `${id}-text`, text: id }],
  };
}

const drawnIds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-drawn]'), (element) =>
    element.getAttribute('data-drawn'),
  );

afterEach(() => {
  vi.useRealTimers();
  useLayerStore.getState().select(null);
});

describe('Canvas', () => {
  it('pans and zooms without redrawing the artboards', async () => {
    const page = createDocument().pages[0];
    if (page === undefined) throw new Error('No page');
    useViewStore.getState().setViewport(page.id, { x: 0, y: 0, zoom: 1 });
    const container = await render(<Canvas page={page} css="" assetToken="t" assetsVersion={0} />);
    const before = drawn.count;

    act(() => {
      useViewStore.getState().setViewport(page.id, { x: 40, y: 20, zoom: 0.5 });
    });

    expect(container.querySelector('[style*="scale("]')?.getAttribute('style')).toBe(
      'transform: translate(40px, 20px) scale(0.5);',
    );
    expect(before).toBe(1);
    expect(drawn.count).toBe(1);
  });

  it('draws only the artboards near the screen and the one holding the selection', async () => {
    vi.useFakeTimers();
    const page: Page = {
      id: 'cull',
      name: 'Cull',
      artboards: [artboard('near', 0), artboard('far', 5000)],
    };
    useViewStore.getState().setViewport(page.id, { x: 0, y: 0, zoom: 1 });
    const container = await render(<Canvas page={page} css="" assetToken="t" assetsVersion={0} />);
    expect(drawnIds(container)).toEqual(['near']);

    act(() => {
      useLayerStore.getState().select({ pageId: page.id, id: 'far-text' });
    });
    expect(drawnIds(container)).toEqual(['far', 'near']);

    act(() => {
      useLayerStore.getState().select(null);
      useViewStore.getState().setViewport(page.id, { x: 0, y: 0, zoom: 1 });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(drawnIds(container)).toEqual(['near']);

    act(() => {
      useViewStore.getState().setViewport(page.id, { x: -5000, y: 0, zoom: 1 });
    });
    expect(drawnIds(container)).toEqual(['near']);
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(drawnIds(container)).toEqual(['far', 'near']);
    act(() => {
      vi.advanceTimersByTime(483);
    });
    expect(drawnIds(container)).toEqual(['far', 'near']);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(drawnIds(container)).toEqual(['far']);
  });

  it('adds artboards that come into view one per frame, nearest first', async () => {
    vi.useFakeTimers();
    const page: Page = {
      id: 'zoom-out',
      name: 'Zoom out',
      artboards: [artboard('near', 0), artboard('b', 3200), artboard('a', 3000)],
    };
    useViewStore.getState().setViewport(page.id, { x: 0, y: 0, zoom: 1 });
    const container = await render(<Canvas page={page} css="" assetToken="t" assetsVersion={0} />);
    expect(drawnIds(container)).toEqual(['near']);

    act(() => {
      useViewStore.getState().setViewport(page.id, { x: 0, y: 0, zoom: 0.1 });
    });
    expect(drawnIds(container)).toEqual(['near']);
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(drawnIds(container)).toEqual(['a', 'near']);
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(drawnIds(container)).toEqual(['a', 'b', 'near']);
  });
});
