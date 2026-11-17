import type { Artboard, Layout } from '@vision/format';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentState } from '../../shared/contract';
import { vision } from '../bridge';
import { ArtboardFrame } from '../design/ArtboardFrame';
import { useCompiledDesign } from '../design/use-compiled-design';
import { canvasColorReader, measureArtboard } from '../features/review/measure';

export function ReviewView({ artboardId }: { artboardId: string | undefined }) {
  const [state, setState] = useState<DocumentState | null>(null);
  const [drawn, setDrawn] = useState<ReadonlyMap<string, Document>>(new Map());
  const signalled = useRef(false);
  const fail = useCallback((error: unknown) => {
    if (signalled.current) return;
    signalled.current = true;
    void vision.captureFailed(error instanceof Error ? error.message : String(error));
  }, []);
  const compiled = useCompiledDesign(state?.document ?? null, fail);
  const artboards = useMemo(
    () =>
      compiled?.document.pages
        .flatMap((page) => page.artboards)
        .filter((artboard) => artboardId === undefined || artboard.id === artboardId) ?? null,
    [compiled, artboardId],
  );

  useEffect(() => {
    vision.getState().then(setState, fail);
  }, [fail]);

  const onDrawn = useCallback((id: string, document: Document) => {
    setDrawn((previous) =>
      previous.get(id) === document ? previous : new Map(previous).set(id, document),
    );
  }, []);

  useEffect(() => {
    if (artboards === null || signalled.current) return;
    if (artboards.some((artboard) => !drawn.has(artboard.id))) return;
    signalled.current = true;
    measureAll(artboards, drawn)
      .then((layout) => vision.reviewReady(layout))
      .catch((error: unknown) => {
        signalled.current = false;
        fail(error);
      });
  }, [artboards, drawn, fail]);

  if (compiled === null || state === null || artboards === null) return null;
  return (
    <div className="flex flex-col items-start">
      {artboards.map((artboard) => (
        <ReviewedArtboard
          key={artboard.id}
          artboard={artboard}
          css={compiled.css}
          assetToken={state.assetToken}
          assetsVersion={state.assetsVersion}
          onDrawn={onDrawn}
        />
      ))}
    </div>
  );
}

function ReviewedArtboard({
  artboard,
  css,
  assetToken,
  assetsVersion,
  onDrawn,
}: {
  artboard: Artboard;
  css: string;
  assetToken: string;
  assetsVersion: number;
  onDrawn: (id: string, document: Document) => void;
}) {
  const onRendered = useCallback(
    (document: Document) => {
      onDrawn(artboard.id, document);
    },
    [artboard.id, onDrawn],
  );
  return (
    <ArtboardFrame
      artboard={artboard}
      css={css}
      assetToken={assetToken}
      assetsVersion={assetsVersion}
      onRendered={onRendered}
    />
  );
}

async function measureAll(
  artboards: Artboard[],
  drawn: ReadonlyMap<string, Document>,
): Promise<Layout> {
  const documents = artboards.flatMap((artboard) => {
    const document = drawn.get(artboard.id);
    return document === undefined ? [] : [{ id: artboard.id, document }];
  });
  await Promise.all(documents.map(({ document }) => settle(document)));
  const readColor = canvasColorReader();
  return Object.assign(
    {},
    ...documents.map(({ id, document }) => measureArtboard(document, id, readColor)),
  ) as Layout;
}

async function settle(document: Document): Promise<void> {
  document.body.getBoundingClientRect();
  await document.fonts.ready;
  await Promise.allSettled(Array.from(document.images, (image) => image.decode()));
}
