import type { Page } from '@vision/format';
import { useEffect, useState } from 'react';
import { cn } from 'cn';
import type { Viewport } from '../../stores/view-store';
import type { Bounds } from '../canvas/viewport';
import { layerBounds, layerElement } from './canvas-layers';
import { useLayerStore } from './layer-store';

export function LayerOverlays({ page, viewport }: { page: Page; viewport: Viewport }) {
  const selected = useLayerStore((store) =>
    store.selection?.pageId === page.id ? store.selection.id : null,
  );
  const hovered = useLayerStore((store) => store.hovered);
  const hoverBounds = useBounds(page, hovered === selected ? null : hovered);
  const selectedBounds = useBounds(page, selected);
  return (
    <>
      {hoverBounds !== null && <Outline bounds={hoverBounds} viewport={viewport} />}
      {selectedBounds !== null && (
        <>
          <Outline bounds={selectedBounds} viewport={viewport} selected />
          <span
            data-testid="layer-size"
            className="pointer-events-none absolute h-5 -translate-x-1/2 rounded-sm bg-ring px-1.5 text-xs leading-5 font-medium whitespace-nowrap text-primary-foreground tabular-nums"
            style={{
              left: viewport.x + (selectedBounds.x + selectedBounds.width / 2) * viewport.zoom,
              top: viewport.y + (selectedBounds.y + selectedBounds.height) * viewport.zoom + 6,
            }}
          >
            {Math.round(selectedBounds.width)} × {Math.round(selectedBounds.height)}
          </span>
        </>
      )}
    </>
  );
}

function Outline({
  bounds,
  viewport,
  selected = false,
}: {
  bounds: Bounds;
  viewport: Viewport;
  selected?: boolean;
}) {
  return (
    <div
      data-testid={selected ? 'selected-layer' : 'hovered-layer'}
      className={cn(
        'pointer-events-none absolute outline-ring',
        selected ? 'outline-[1.5px]' : 'outline-1',
      )}
      style={{
        left: viewport.x + bounds.x * viewport.zoom,
        top: viewport.y + bounds.y * viewport.zoom,
        width: bounds.width * viewport.zoom,
        height: bounds.height * viewport.zoom,
      }}
    />
  );
}

function useBounds(page: Page, id: string | null): Bounds | null {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  useEffect(() => {
    const measure = () => {
      const next = id === null ? null : layerBounds(page, id);
      setBounds((current) => (sameBounds(current, next) ? current : next));
    };
    const frame = requestAnimationFrame(measure);
    const element = id === null ? null : layerElement(page, id);
    const resizes = new ResizeObserver(measure);
    if (element !== null) resizes.observe(element);
    element?.ownerDocument.addEventListener('load', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      resizes.disconnect();
      element?.ownerDocument.removeEventListener('load', measure, true);
    };
  }, [page, id]);
  return bounds;
}

function sameBounds(a: Bounds | null, b: Bounds | null): boolean {
  return (
    a === b ||
    (a !== null &&
      b !== null &&
      a.x === b.x &&
      a.y === b.y &&
      a.width === b.width &&
      a.height === b.height)
  );
}
