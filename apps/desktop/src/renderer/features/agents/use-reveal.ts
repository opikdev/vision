import { diffDocuments, type VisionDocument } from '@vision/format';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { drawnNode } from './drawn-nodes';
import { RevealScheduler } from './reveal-scheduler';

interface Step {
  added: boolean;
  element: Element;
}

export function useReveal(document: VisionDocument | null): void {
  const shown = useRef<VisionDocument | null>(null);
  const [scheduler] = useState(() => new RevealScheduler<Step>());

  useLayoutEffect(() => {
    const before = shown.current;
    shown.current = document;
    if (before === null || document === null || before === document) return;
    scheduler.finish();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const steps = stepsBetween(before, document);
    for (const { added, element } of steps) {
      if (added) element.setAttribute('data-reveal', 'hidden');
    }
    scheduler.start(steps, {
      step: ({ added, element }) => {
        element.setAttribute('data-reveal', added ? 'added' : 'changed');
      },
      end: () => {
        for (const { element } of steps) element.removeAttribute('data-reveal');
      },
    });
  }, [document, scheduler]);

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
    return element === null ? [] : [{ added: change === 'added', element }];
  });
}
