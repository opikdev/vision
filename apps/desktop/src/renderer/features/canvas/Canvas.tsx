import type { Page } from '@vision/format';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { ArtboardFrame } from '../../design/ArtboardFrame';
import { useViewStore } from '../../stores/view-store';
import { cx } from '../../ui/cx';
import { fitPage } from './canvas-commands';
import { useCanvasGestures } from './use-canvas-gestures';
import { labelRoom, type Viewport } from './viewport';

export function Canvas({
  page,
  css,
  assetToken,
  overlay,
}: {
  page: Page | undefined;
  css: string | null;
  assetToken: string;
  overlay?: (viewport: Viewport) => ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const size = useViewStore((store) => store.canvasSize);
  const stored = useViewStore((store) =>
    page === undefined ? undefined : store.viewports[page.id],
  );
  const setViewport = useViewStore((store) => store.setViewport);
  const setCanvasSize = useViewStore((store) => store.setCanvasSize);
  const { handlers, cursor } = useCanvasGestures(container);
  const viewport = stored ?? (page !== undefined && size !== null ? fitPage(page, size) : null);

  useLayoutEffect(() => {
    const element = container.current;
    if (element === null) return;
    const measure = () => {
      setCanvasSize({ width: element.clientWidth, height: element.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [setCanvasSize]);

  useLayoutEffect(() => {
    if (page !== undefined && stored === undefined && viewport !== null)
      setViewport(page.id, viewport);
  }, [page, stored, viewport, setViewport]);

  const x = Math.round(viewport?.x ?? 0);
  const y = Math.round(viewport?.y ?? 0);
  const zoom = viewport?.zoom ?? 1;
  const artboards = [...(page?.artboards ?? [])].sort((a, b) => (a.id < b.id ? -1 : 1));

  return (
    <div
      ref={container}
      role="region"
      aria-label="Canvas"
      tabIndex={-1}
      className={cx('dot-grid absolute inset-0 overflow-hidden outline-none', cursor)}
      style={{ backgroundPosition: `${x}px ${y}px` }}
      {...handlers}
    >
      {viewport !== null && css !== null && (
        <>
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})` }}
          >
            {artboards.map((artboard) => (
              <div
                key={artboard.id}
                className="absolute"
                style={{ left: artboard.x, top: artboard.y }}
              >
                <ArtboardFrame artboard={artboard} css={css} assetToken={assetToken} />
              </div>
            ))}
          </div>
          {artboards.map((artboard) => (
            <div
              key={artboard.id}
              className="pointer-events-none absolute flex h-4 items-center gap-2 overflow-hidden whitespace-nowrap"
              style={{
                left: Math.round(x + artboard.x * zoom),
                top: Math.round(y + artboard.y * zoom) - 24,
                maxWidth: Math.max(labelRoom(artboard, artboards) * zoom, 48),
              }}
            >
              <span className="truncate">{artboard.name}</span>
              <span className="text-ink-subtle tabular-nums">
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
