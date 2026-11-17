import type { Page } from '@vision/format';
import type { Locator } from './agent-tracker';
import { labelTarget, nodeTarget } from './cursor-geometry';

export function drawnNode(artboardId: string, id: string): Element | null {
  const frame = document.querySelector<HTMLIFrameElement>(
    `iframe[data-artboard-id="${CSS.escape(artboardId)}"]`,
  );
  return frame?.contentDocument?.querySelector(`[data-node-id="${CSS.escape(id)}"]`) ?? null;
}

export function pageLocator(page: () => Page | undefined): Locator {
  return {
    node: (id) => {
      for (const artboard of page()?.artboards ?? []) {
        const element = drawnNode(artboard.id, id);
        if (element !== null) return nodeTarget(artboard, element.getBoundingClientRect());
      }
      return null;
    },
    label: (artboardId) => {
      const artboard = page()?.artboards.find((candidate) => candidate.id === artboardId);
      return artboard === undefined ? null : labelTarget(artboard);
    },
  };
}
