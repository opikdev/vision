import type { Size, Viewport } from '../../stores/view-store';

export interface Point {
  x: number;
  y: number;
}

export interface Bounds extends Point, Size {}

export const minZoom = 0.02;
export const maxZoom = 8;

const zoomSteps = [
  0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8,
];

export function clampZoom(zoom: number): number {
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}

export function zoomAt(viewport: Viewport, zoom: number, point: Point): Viewport {
  const next = clampZoom(zoom);
  const scale = next / viewport.zoom;
  return {
    x: point.x - (point.x - viewport.x) * scale,
    y: point.y - (point.y - viewport.y) * scale,
    zoom: next,
  };
}

export function centerOn(viewport: Viewport, point: Point, size: Size): Viewport {
  return {
    x: size.width / 2 - point.x * viewport.zoom,
    y: size.height / 2 - point.y * viewport.zoom,
    zoom: viewport.zoom,
  };
}

export function nextZoomStep(zoom: number, direction: 1 | -1): number {
  const minimumChange = 1.05;
  const step =
    direction === 1
      ? zoomSteps.find((candidate) => candidate > zoom * minimumChange)
      : zoomSteps.findLast((candidate) => candidate < zoom / minimumChange);
  return step ?? (direction === 1 ? maxZoom : minZoom);
}

export function wheelZoomFactor(deltaY: number): number {
  return Math.exp(-Math.max(-50, Math.min(50, deltaY)) * 0.01);
}

export function fitBounds(
  bounds: Bounds,
  size: Size,
  padding: number,
  reserveBottom = 0,
): Viewport {
  const area = {
    width: Math.max(1, size.width - padding * 2),
    height: Math.max(1, size.height - padding * 2 - reserveBottom),
  };
  const zoom = clampZoom(Math.min(area.width / bounds.width, area.height / bounds.height, 1));
  return {
    x: padding + (area.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: padding + (area.height - bounds.height * zoom) / 2 - bounds.y * zoom,
    zoom,
  };
}

export function unionBounds(boxes: readonly Bounds[]): Bounds | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function labelRoom(box: Bounds, others: readonly Bounds[]): number {
  const gap = 16;
  const nextLeft = others
    .filter(
      (other) =>
        other.x >= box.x + box.width &&
        other.y < box.y + box.height &&
        other.y + other.height > box.y,
    )
    .reduce((left, other) => Math.min(left, other.x), Number.POSITIVE_INFINITY);
  return nextLeft - box.x - gap;
}
