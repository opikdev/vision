import type { Page } from '@vision/format';
import { drawnBounds, drawnNode } from '../canvas/drawn-nodes';
import type { Locator } from './agent-tracker';
import { labelTarget, nodeTarget } from './cursor-geometry';

export function pageLocator(page: () => Page | undefined): Locator {
  return {
    node: (id) => {
      for (const artboard of page()?.artboards ?? []) {
        const element = drawnNode(artboard.id, id);
        if (element !== null) return nodeTarget(artboard.id, drawnBounds(artboard, element));
      }
      return null;
    },
    label: (artboardId) => {
      const artboard = page()?.artboards.find((candidate) => candidate.id === artboardId);
      return artboard === undefined ? null : labelTarget(artboard);
    },
  };
}
