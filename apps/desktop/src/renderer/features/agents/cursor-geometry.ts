import type { Viewport } from '../../stores/view-store';
import type { Point } from '../canvas/viewport';

export interface CursorTarget {
  artboardId: string;
  x: number;
  y: number;
  onLabel: boolean;
}

export interface Placed {
  id: string;
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const nodeInset = 12;
const labelOffset = { x: 24, y: -16 };

export function nodeTarget(artboard: Placed, box: Box): CursorTarget {
  return {
    artboardId: artboard.id,
    x: artboard.x + box.left + Math.min(box.width / 2, nodeInset),
    y: artboard.y + box.top + Math.min(box.height / 2, nodeInset),
    onLabel: false,
  };
}

export function labelTarget(artboard: Placed): CursorTarget {
  return { artboardId: artboard.id, x: artboard.x, y: artboard.y, onLabel: true };
}

export function labelShift(target: CursorTarget): Point {
  return target.onLabel ? labelOffset : { x: 0, y: 0 };
}

export function screenPoint(target: CursorTarget, viewport: Viewport): Point {
  const shift = labelShift(target);
  return {
    x: viewport.x + target.x * viewport.zoom + shift.x,
    y: viewport.y + target.y * viewport.zoom + shift.y,
  };
}
