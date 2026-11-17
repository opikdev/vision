import type { Page } from '@vision/format';
import { useRef, type MouseEvent, type PointerEvent } from 'react';
import { layerAt } from './canvas-layers';
import { useLayerStore } from './layer-store';

const clickSlop = 4;

export function useLayerPointer(page: Page | undefined, panning: boolean) {
  const down = useRef<{ x: number; y: number } | null>(null);

  const pointed = (event: MouseEvent): string | null => {
    if (page === undefined || !(event.target instanceof Element)) return null;
    const label = event.target.closest('[data-artboard-label]');
    if (label !== null) return label.getAttribute('data-artboard-label');
    return layerAt(page, { x: event.clientX, y: event.clientY });
  };

  const onControl = (event: MouseEvent) =>
    event.target instanceof Element && event.target.closest('button, a, input') !== null;

  return {
    onPointerDown: (event: PointerEvent) => {
      down.current =
        event.button === 0 && !panning && !onControl(event)
          ? { x: event.clientX, y: event.clientY }
          : null;
    },
    onPointerMove: (event: PointerEvent) => {
      if (event.buttons !== 0 || panning) return;
      useLayerStore.getState().hover(onControl(event) ? null : pointed(event));
    },
    onPointerUp: (event: PointerEvent) => {
      const start = down.current;
      down.current = null;
      if (start === null || page === undefined) return;
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > clickSlop) return;
      const id = pointed(event);
      if (id === null) useLayerStore.getState().select(null);
      else useLayerStore.getState().reveal(page, id);
    },
    onPointerLeave: () => {
      useLayerStore.getState().hover(null);
    },
  };
}
