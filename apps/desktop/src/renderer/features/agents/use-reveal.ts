import type { VisionDocument } from '@vision/format';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useViewStore } from '../../stores/view-store';
import { drawnNode } from '../canvas/drawn-nodes';
import { useLayerStore } from '../layers/layer-store';
import type { AgentPlayback, RevealStep } from './agent-playback';
import { changedNodes } from './changed-nodes';

export function useReveal(document: VisionDocument | null, playback: AgentPlayback): void {
  const shown = useRef<VisionDocument | null>(null);

  useLayoutEffect(() => {
    const before = shown.current;
    shown.current = document;
    if (before === null || document === null || before === document) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      playback.flush();
      return;
    }
    playback.hideWaiting();
    playback.play(stepsBetween(before, document));
  }, [document, playback]);

  useEffect(() => {
    const stopView = useViewStore.subscribe((view, previous) => {
      if (view.viewports !== previous.viewports || view.pageId !== previous.pageId)
        playback.hurry();
    });
    const stopLayers = useLayerStore.subscribe((layers, previous) => {
      if (layers.selection !== previous.selection) playback.hurry();
    });
    return () => {
      stopView();
      stopLayers();
      playback.flush();
    };
  }, [playback]);
}

function stepsBetween(before: VisionDocument, after: VisionDocument): RevealStep[] {
  return changedNodes(before, after).flatMap(({ change, located }) => {
    if (located.kind !== 'node' || drawnNode(located.artboard.id, located.node.id) === null) {
      return [];
    }
    return [{ id: located.node.id, artboard: located.artboard, added: change === 'added' }];
  });
}
