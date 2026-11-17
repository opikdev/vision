import { diffDocuments, type Artboard, type VisionDocument } from '@vision/format';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AgentTracker } from './agent-tracker';
import { nodeTarget } from './cursor-geometry';
import { drawnNode } from './drawn-nodes';
import { RevealScheduler } from './reveal-scheduler';

interface Step {
  id: string;
  added: boolean;
  element: Element;
  artboard: Artboard;
}

export function useReveal(document: VisionDocument | null, tracker: AgentTracker): void {
  const shown = useRef<VisionDocument | null>(null);
  const [scheduler] = useState(() => new RevealScheduler<Step>());

  useLayoutEffect(() => {
    const before = shown.current;
    shown.current = document;
    if (before === null || document === null || before === document) return;
    scheduler.finish();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const steps = stepsBetween(before, document);
    const ids = steps.map(({ id }) => id);
    for (const { added, element } of steps) {
      if (added) element.setAttribute('data-reveal', 'hidden');
    }
    tracker.revealStarted(ids);
    scheduler.start(steps, {
      step: ({ id, added, element, artboard }) => {
        tracker.revealed(id, nodeTarget(artboard, element.getBoundingClientRect()));
        element.setAttribute('data-reveal', added ? 'added' : 'changed');
      },
      end: () => {
        for (const { element } of steps) element.removeAttribute('data-reveal');
        tracker.revealEnded(ids);
      },
    });
  }, [document, scheduler, tracker]);

  useEffect(
    () => () => {
      scheduler.finish();
    },
    [scheduler],
  );
}

function stepsBetween(before: VisionDocument, after: VisionDocument): Step[] {
  return diffDocuments(before, after).touched.flatMap(({ change, located }) => {
    if (located.kind !== 'node') return [];
    const element = drawnNode(located.artboard.id, located.node.id);
    if (element === null) return [];
    return [
      { id: located.node.id, added: change === 'added', element, artboard: located.artboard },
    ];
  });
}
