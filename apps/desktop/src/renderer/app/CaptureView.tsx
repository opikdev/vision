import { useCallback, useEffect, useRef, useState } from 'react';
import { captureMarkerColor } from '../../shared/capture';
import type { DocumentState } from '../../shared/contract';
import { vision } from '../bridge';
import { ArtboardFrame } from '../design/ArtboardFrame';
import { useCompiledDesign } from '../design/use-compiled-design';

export function CaptureView({ artboardId }: { artboardId: string }) {
  const [state, setState] = useState<DocumentState | null>(null);
  const [drawn, setDrawn] = useState(false);
  const signalled = useRef(false);
  const fail = useCallback((error: unknown) => {
    if (signalled.current) return;
    signalled.current = true;
    void vision.captureFailed(error instanceof Error ? error.message : String(error));
  }, []);
  const compiled = useCompiledDesign(state?.document ?? null, fail);
  const artboard = compiled?.document.pages
    .flatMap((page) => page.artboards)
    .find((candidate) => candidate.id === artboardId);

  useEffect(() => {
    vision.getState().then(setState, fail);
  }, [fail]);

  useEffect(() => {
    if (compiled !== null && artboard === undefined) fail(`No artboard with id "${artboardId}"`);
  }, [compiled, artboard, artboardId, fail]);

  const onRendered = useCallback(
    (document: Document) => {
      if (signalled.current) return;
      waitForPaint(document).then(() => {
        signalled.current = true;
        setDrawn(true);
      }, fail);
    },
    [fail],
  );

  useEffect(() => {
    if (drawn) vision.captureReady().catch(fail);
  }, [drawn, fail]);

  if (compiled === null || state === null || artboard === undefined) return null;
  return (
    <div className="absolute top-0 left-0">
      <ArtboardFrame
        artboard={artboard}
        css={compiled.css}
        assetToken={state.assetToken}
        assetsVersion={state.assetsVersion}
        onRendered={onRendered}
      />
      {drawn && (
        <div
          aria-hidden
          className="absolute left-0 size-px"
          style={{ top: artboard.height, background: captureMarkerColor }}
        />
      )}
    </div>
  );
}

async function waitForPaint(document: Document): Promise<void> {
  await document.fonts.ready;
  await Promise.allSettled(Array.from(document.images, (image) => image.decode()));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
