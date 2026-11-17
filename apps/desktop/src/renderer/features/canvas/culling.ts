import type { Size, Viewport } from '../../stores/view-store';
import type { Bounds } from './viewport';

export const cullMargin = 600;

export function artboardsToDraw(
  artboards: readonly (Bounds & { id: string })[],
  viewport: Viewport,
  size: Size,
  keep: ReadonlySet<string>,
): string[] {
  const left = (-cullMargin - viewport.x) / viewport.zoom;
  const top = (-cullMargin - viewport.y) / viewport.zoom;
  const right = (size.width + cullMargin - viewport.x) / viewport.zoom;
  const bottom = (size.height + cullMargin - viewport.y) / viewport.zoom;
  const center = {
    x: (size.width / 2 - viewport.x) / viewport.zoom,
    y: (size.height / 2 - viewport.y) / viewport.zoom,
  };
  const distance = (artboard: Bounds) =>
    Math.hypot(
      artboard.x + artboard.width / 2 - center.x,
      artboard.y + artboard.height / 2 - center.y,
    );
  return artboards
    .filter(
      (artboard) =>
        keep.has(artboard.id) ||
        (artboard.x < right &&
          artboard.x + artboard.width > left &&
          artboard.y < bottom &&
          artboard.y + artboard.height > top),
    )
    .toSorted(
      (a, b) => Number(keep.has(b.id)) - Number(keep.has(a.id)) || distance(a) - distance(b),
    )
    .map((artboard) => artboard.id);
}
