import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentState } from '../../shared/contract';
import { vision } from '../bridge';
import { ArtboardFrame } from '../design/ArtboardFrame';
import { useCompiledDesign } from '../design/use-compiled-design';

export function CaptureView({ artboardId }: { artboardId: string }) {
  const [state, setState] = useState<DocumentState | null>(null);
  const compiled = useCompiledDesign(state?.document ?? null);
  const signalled = useRef(false);
  const artboard = compiled?.document.pages
    .flatMap((page) => page.artboards)
    .find((candidate) => candidate.id === artboardId);

  const fail = useCallback((message: string) => {
    if (signalled.current) return;
    signalled.current = true;
    void vision.captureFailed(message);
  }, []);

  useEffect(() => {
    vision.getState().then(setState, (error: unknown) => {
      fail(error instanceof Error ? error.message : String(error));
    });
  }, [fail]);

  useEffect(() => {
    if (compiled !== null && artboard === undefined) fail(`No artboard with id "${artboardId}"`);
  }, [compiled, artboard, artboardId, fail]);

  const onRendered = useCallback(
    (document: Document) => {
      if (signalled.current) return;
      waitForPaint(document).then(
        () => {
          signalled.current = true;
          return vision.captureReady();
        },
        (error: unknown) => {
          fail(error instanceof Error ? error.message : String(error));
        },
      );
    },
    [fail],
  );

  if (compiled === null || state === null || artboard === undefined) return null;
  return (
    <div className="absolute top-0 left-0">
      <ArtboardFrame
        artboard={artboard}
        css={compiled.css}
        assetToken={state.assetToken}
        onRendered={onRendered}
      />
    </div>
  );
}

async function waitForPaint(document: Document): Promise<void> {
  await document.fonts.ready;
  await Promise.allSettled(Array.from(document.images, (image) => image.decode()));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
