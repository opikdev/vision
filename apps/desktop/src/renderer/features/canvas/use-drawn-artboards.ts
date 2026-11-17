import type { Page } from '@vision/format';
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Size, Viewport } from '../../stores/view-store';
import { useAgentStore } from '../agents/agent-store';
import { findLayer } from '../layers/layer-rows';
import { useLayerStore } from '../layers/layer-store';
import { artboardsToDraw } from './culling';

const settleMs = 500;

export function useDrawnArtboards(
  page: Page | undefined,
  viewport: Viewport | null,
  size: Size | null,
): ReadonlySet<string> {
  const selected = useLayerStore((store) =>
    store.selection?.pageId === page?.id ? (store.selection?.id ?? null) : null,
  );
  const agentArtboards = useAgentStore(
    useShallow((store) =>
      Object.values(store.agents).flatMap((presence) => [
        presence.artboardId ?? '',
        presence.target?.artboardId ?? '',
      ]),
    ),
  );
  const selectedArtboard = useMemo(
    () => (page === undefined || selected === null ? null : findLayer(page, selected)?.artboard.id),
    [page, selected],
  );
  const keep = useMemo(
    () => new Set([...agentArtboards, ...(selectedArtboard == null ? [] : [selectedArtboard])]),
    [agentArtboards, selectedArtboard],
  );
  const wanted = useMemo(
    () =>
      page === undefined || viewport === null || size === null
        ? []
        : artboardsToDraw(page.artboards, viewport, size, keep),
    [page, viewport, size, keep],
  );
  const [drawn, setDrawn] = useState<ReadonlySet<string>>(() => new Set(wanted));
  const urgent = wanted.filter((id) => keep.has(id) && !drawn.has(id));
  if (urgent.length > 0) setDrawn(new Set([...drawn, ...urgent]));

  // Mounting an artboard builds its whole DOM, so zooming out adds one per frame, nearest first.
  useEffect(() => {
    if (wanted.every((id) => drawn.has(id))) return;
    const frame = requestAnimationFrame(() => {
      setDrawn((current) => {
        const next = wanted.find((id) => !current.has(id));
        return next === undefined ? current : new Set([...current, next]);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [wanted, drawn]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDrawn((current) =>
        current.size === wanted.length && wanted.every((id) => current.has(id))
          ? current
          : new Set(wanted),
      );
    }, settleMs);
    return () => {
      clearTimeout(timer);
    };
  }, [wanted]);
  return drawn;
}
