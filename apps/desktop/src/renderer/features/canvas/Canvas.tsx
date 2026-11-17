import type { Artboard, Page } from '@vision/format';
import { memo, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { cn } from 'cn';
import { ArtboardFrame } from '../../design/ArtboardFrame';
import { useViewStore, type Viewport } from '../../stores/view-store';
import { fitPage, resizeCanvas } from './canvas-commands';
import { useLayerPointer } from '../layers/use-layer-pointer';
import { useCanvasGestures } from './use-canvas-gestures';
import { labelRoom } from './viewport';

export function Canvas({
  page,
  css,
  assetToken,
  assetsVersion,
  overlay,
}: {
  page: Page | undefined;
  css: string | null;
  assetToken: string;
  assetsVersion: number;
  overlay?: (viewport: Viewport) => ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const size = useViewStore((store) => store.canvasSize);
  const stored = useViewStore((store) =>
    page === undefined ? undefined : store.viewports[page.id],
  );
  const fitViewport = useViewStore((store) => store.fitViewport);
  const { handlers, cursor, grabbing } = useCanvasGestures(container);
  const layers = useLayerPointer(page, grabbing);
  const viewport = stored ?? (page !== undefined && size !== null ? fitPage(page, size) : null);

  useLayoutEffect(() => {
    const element = container.current;
    if (element === null) return;
    const measure = () => {
      resizeCanvas({ width: element.clientWidth, height: element.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (page !== undefined && stored === undefined && viewport !== null)
      fitViewport(page.id, viewport);
  }, [page, stored, viewport, fitViewport]);

  const x = Math.round(viewport?.x ?? 0);
  const y = Math.round(viewport?.y ?? 0);
  const zoom = viewport?.zoom ?? 1;
  const artboards = useMemo(
    () => [...(page?.artboards ?? [])].sort((a, b) => (a.id < b.id ? -1 : 1)),
    [page],
  );

  return (
    <div
      ref={container}
      role="region"
      aria-label="Canvas"
      tabIndex={-1}
      className={cn('dot-grid absolute inset-0 overflow-hidden outline-none', cursor)}
      style={{ backgroundPosition: `${x}px ${y}px` }}
      onPointerDown={(event) => {
        handlers.onPointerDown(event);
        layers.onPointerDown(event);
      }}
      onPointerMove={(event) => {
        handlers.onPointerMove(event);
        layers.onPointerMove(event);
      }}
      onPointerUp={(event) => {
        handlers.onPointerUp();
        layers.onPointerUp(event);
      }}
      onPointerCancel={handlers.onPointerCancel}
      onPointerLeave={layers.onPointerLeave}
      onContextMenu={layers.onContextMenu}
    >
      {viewport !== null && css !== null && (
        <>
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})` }}
          >
            <ArtboardLayer
              artboards={artboards}
              css={css}
              assetToken={assetToken}
              assetsVersion={assetsVersion}
            />
          </div>
          {artboards.map((artboard) => (
            <div
              key={artboard.id}
              data-artboard-label={artboard.id}
              className="absolute flex h-4 items-center gap-2 overflow-hidden whitespace-nowrap"
              style={{
                left: Math.round(x + artboard.x * zoom),
                top: Math.round(y + artboard.y * zoom) - 24,
                maxWidth: Math.max(labelRoom(artboard, artboards) * zoom, 48),
              }}
            >
              <span className="truncate">{artboard.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {artboard.width}×{artboard.height}
              </span>
            </div>
          ))}
          {overlay?.({ x, y, zoom })}
        </>
      )}
    </div>
  );
}

const ArtboardLayer = memo(function ArtboardLayer({
  artboards,
  css,
  assetToken,
  assetsVersion,
}: {
  artboards: Artboard[];
  css: string;
  assetToken: string;
  assetsVersion: number;
}) {
  return artboards.map((artboard) => (
    <PlacedArtboard
      key={artboard.id}
      artboard={artboard}
      css={css}
      assetToken={assetToken}
      assetsVersion={assetsVersion}
    />
  ));
});

const PlacedArtboard = memo(function PlacedArtboard({
  artboard,
  css,
  assetToken,
  assetsVersion,
}: {
  artboard: Artboard;
  css: string;
  assetToken: string;
  assetsVersion: number;
}) {
  return (
    <div className="absolute" style={{ left: artboard.x, top: artboard.y }}>
      <ArtboardFrame
        artboard={artboard}
        css={css}
        assetToken={assetToken}
        assetsVersion={assetsVersion}
      />
    </div>
  );
});
