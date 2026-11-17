import type { Page } from '@vision/format';
import { useRef, type MouseEvent, type PointerEvent } from 'react';
import { layerPathAt } from './canvas-layers';
import { useLayerStore } from './layer-store';

const clickSlop = 4;

export function useLayerPointer(page: Page | undefined, grabbing: boolean) {
  const down = useRef<{ x: number; y: number } | null>(null);

  const pointedPath = (event: MouseEvent): string[] => {
    if (page === undefined || !(event.target instanceof Element)) return [];
    if (isOnControl(event)) return [];
    const label = event.target
      .closest('[data-artboard-label]')
      ?.getAttribute('data-artboard-label');
    if (label != null) return [label];
    return layerPathAt(page, { x: event.clientX, y: event.clientY });
  };

  return {
    onPointerDown: (event: PointerEvent) => {
      down.current =
        event.button === 0 && !grabbing && !isOnControl(event)
          ? { x: event.clientX, y: event.clientY }
          : null;
    },
    onPointerMove: (event: PointerEvent) => {
      if (event.buttons !== 0 || grabbing) return;
      useLayerStore.getState().hover(pointedPath(event)[0] ?? null);
    },
    onPointerUp: (event: PointerEvent) => {
      const start = down.current;
      down.current = null;
      if (start === null || page === undefined) return;
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > clickSlop) return;
      const id = pointedPath(event)[0];
      if (id === undefined) useLayerStore.getState().select(null);
      else useLayerStore.getState().reveal(page, id);
    },
    onPointerLeave: () => {
      useLayerStore.getState().hover(null);
    },
    onContextMenu: (event: MouseEvent) => {
      const path = pointedPath(event);
      const selected = useLayerStore.getState().selection?.id;
      const id = selected !== undefined && path.includes(selected) ? selected : path[0];
      if (id === undefined || page === undefined) event.stopPropagation();
      else useLayerStore.getState().reveal(page, id);
    },
  };
}

function isOnControl(event: MouseEvent): boolean {
  return event.target instanceof Element && event.target.closest('button, a, input') !== null;
}
