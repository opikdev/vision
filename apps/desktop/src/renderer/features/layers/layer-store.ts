import type { Page } from '@vision/format';
import { useLayoutEffect } from 'react';
import { create } from 'zustand';
import { findLayer } from './layer-rows';

export interface LayerSelection {
  pageId: string;
  id: string;
}

interface LayerStore {
  selection: LayerSelection | null;
  hovered: string | null;
  expanded: ReadonlySet<string>;
  revealed: number;
  select: (selection: LayerSelection | null) => void;
  hover: (id: string | null) => void;
  setExpanded: (id: string, expanded: boolean) => void;
  reveal: (page: Page, id: string) => void;
  sync: (page: Page | undefined) => void;
}

export const useLayerStore = create<LayerStore>()((set, get) => ({
  selection: null,
  hovered: null,
  expanded: new Set(),
  revealed: 0,
  select: (selection) => {
    set({ selection });
  },
  hover: (hovered) => {
    if (get().hovered !== hovered) set({ hovered });
  },
  setExpanded: (id, open) => {
    const { expanded } = get();
    if (expanded.has(id) === open) return;
    const next = new Set(expanded);
    if (open) next.add(id);
    else next.delete(id);
    set({ expanded: next });
  },
  reveal: (page, id) => {
    const found = findLayer(page, id);
    if (found === undefined) return;
    const { expanded, revealed } = get();
    set({
      selection: { pageId: page.id, id },
      expanded: new Set([...expanded, ...found.ancestors]),
      revealed: revealed + 1,
    });
  },
  sync: (page) => {
    const { selection, hovered } = get();
    const exists = (id: string) => page !== undefined && findLayer(page, id) !== undefined;
    if (selection !== null && (selection.pageId !== page?.id || !exists(selection.id))) {
      set({ selection: null });
    }
    if (hovered !== null && !exists(hovered)) set({ hovered: null });
  },
}));

export function useSyncLayers(page: Page | undefined): void {
  useLayoutEffect(() => {
    useLayerStore.getState().sync(page);
  }, [page]);
}
