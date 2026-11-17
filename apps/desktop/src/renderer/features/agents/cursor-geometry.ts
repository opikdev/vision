import type { Size, Viewport } from '../../stores/view-store';
import type { Placed } from '../canvas/drawn-nodes';
import type { Bounds, Point } from '../canvas/viewport';

export interface CursorTarget {
  artboardId: string;
  x: number;
  y: number;
  onLabel: boolean;
}

export type Edge = 'left' | 'right' | 'top' | 'bottom';

export interface EdgePlacement {
  edge: Edge;
  offset: number;
}

const nodeInset = 12;
const labelOffset = { x: 24, y: -16 };
const edgeRoom = { side: 32, end: 140 };

export function nodeTarget(artboardId: string, bounds: Bounds): CursorTarget {
  return {
    artboardId,
    x: bounds.x + Math.min(bounds.width / 2, nodeInset),
    y: bounds.y + Math.min(bounds.height / 2, nodeInset),
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

export function edgePlacement(point: Point, size: Size): EdgePlacement | null {
  const inside = point.x >= 0 && point.x <= size.width && point.y >= 0 && point.y <= size.height;
  if (inside) return null;
  const across = (point.x - size.width / 2) / (size.width / 2);
  const down = (point.y - size.height / 2) / (size.height / 2);
  if (Math.abs(across) >= Math.abs(down)) {
    return {
      edge: across > 0 ? 'right' : 'left',
      offset: clamp(point.y, edgeRoom.side, size.height - edgeRoom.side),
    };
  }
  return {
    edge: down > 0 ? 'bottom' : 'top',
    offset: clamp(point.x, edgeRoom.end, size.width - edgeRoom.end),
  };
}

function clamp(value: number, min: number, max: number): number {
  return max < min ? (min + max) / 2 : Math.min(max, Math.max(min, value));
}
