import type { Bounds } from './viewport';

export interface Placed {
  id: string;
  x: number;
  y: number;
}

export function drawnNode(artboardId: string, id: string): Element | null {
  const frame = document.querySelector<HTMLIFrameElement>(
    `iframe[data-artboard-id="${CSS.escape(artboardId)}"]`,
  );
  return frame?.contentDocument?.querySelector(`[data-node-id="${CSS.escape(id)}"]`) ?? null;
}

export function drawnBounds(artboard: Placed, element: Element): Bounds {
  const box = element.getBoundingClientRect();
  return {
    x: artboard.x + box.left,
    y: artboard.y + box.top,
    width: box.width,
    height: box.height,
  };
}
