// @vitest-environment happy-dom
import { createDocument } from '@vision/format';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useViewStore } from '../../stores/view-store';
import { render } from '../../test/render';
import { Canvas } from './Canvas';

const drawn = vi.hoisted(() => ({ count: 0 }));

vi.mock('../../design/ArtboardFrame', () => ({
  ArtboardFrame: () => {
    drawn.count++;
    return null;
  },
}));

describe('Canvas', () => {
  it('pans and zooms without redrawing the artboards', async () => {
    const page = createDocument().pages[0];
    if (page === undefined) throw new Error('No page');
    useViewStore.getState().setViewport(page.id, { x: 0, y: 0, zoom: 1 });
    const container = await render(<Canvas page={page} css="" assetToken="t" />);
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
});
