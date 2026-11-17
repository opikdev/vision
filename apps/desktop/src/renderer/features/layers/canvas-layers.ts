import type { Page } from '@vision/format';
import { drawnArtboard, drawnBounds, drawnNode } from '../canvas/drawn-nodes';
import type { Bounds, Point } from '../canvas/viewport';
import { findLayer, isArtboard } from './layer-rows';

export function layerPathAt(page: Page, point: Point): string[] {
  for (const artboard of page.artboards.toReversed()) {
    const frame = drawnArtboard(artboard.id);
    if (frame === null) continue;
    const box = frame.getBoundingClientRect();
    const inside =
      point.x >= box.left && point.x < box.right && point.y >= box.top && point.y < box.bottom;
    if (!inside || box.width === 0) continue;
    const scale = box.width / artboard.width;
    const path: string[] = [];
    let element = frame.contentDocument?.elementFromPoint(
      (point.x - box.left) / scale,
      (point.y - box.top) / scale,
    );
    for (; element; element = element.parentElement) {
      const id = element.getAttribute('data-node-id');
      if (id !== null) path.push(id);
    }
    return [...path, artboard.id];
  }
  return [];
}

export function layerElement(page: Page, id: string): Element | null {
  const found = findLayer(page, id);
  if (found === undefined || isArtboard(found.layer)) return null;
  return drawnNode(found.artboard.id, id);
}

export function layerBounds(page: Page, id: string): Bounds | null {
  const found = findLayer(page, id);
  if (found === undefined) return null;
  const { layer, artboard } = found;
  if (isArtboard(layer))
    return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
  const element = drawnNode(artboard.id, id);
  return element === null ? null : drawnBounds(artboard, element);
}
