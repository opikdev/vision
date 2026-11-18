import { drawnBounds, drawnNode } from '../canvas/drawn-nodes';
import type { Stage } from './agent-playback';
import { nodeTarget } from './cursor-geometry';

const outlineMs = 400;

export const drawnStage: Stage = {
  hide: ({ id, artboard }) => {
    drawnNode(artboard.id, id)?.setAttribute('data-reveal', 'hidden');
  },
  show: ({ id, artboard, added }) => {
    const element = drawnNode(artboard.id, id);
    if (element === null) return null;
    const reveal = added ? 'added' : 'changed';
    element.setAttribute('data-reveal', reveal);
    setTimeout(() => {
      if (element.getAttribute('data-reveal') === reveal) element.removeAttribute('data-reveal');
    }, outlineMs);
    return nodeTarget(artboard.id, drawnBounds(artboard, element));
  },
};
