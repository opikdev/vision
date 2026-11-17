import { layerLabel, type Artboard, type Node, type Page } from '@vision/format';

export type Layer = Artboard | Node;

export interface LayerRow {
  id: string;
  depth: number;
  layer: Layer;
  artboard: Artboard;
  parentId: string | null;
  expandable: boolean;
  expanded: boolean;
}

export interface FoundLayer {
  layer: Layer;
  artboard: Artboard;
  ancestors: string[];
}

const labels = new WeakMap<Layer, string>();

export function labelFor(layer: Layer): string {
  let label = labels.get(layer);
  if (label === undefined) {
    label = layerLabel(layer);
    labels.set(layer, label);
  }
  return label;
}

export function isArtboard(layer: Layer): layer is Artboard {
  return !('type' in layer);
}

export function childrenOf(layer: Layer): Node[] {
  if (isArtboard(layer)) return layer.children;
  return layer.type === 'frame' ? (layer.children ?? []) : [];
}

export function visibleRows(page: Page, expanded: ReadonlySet<string>): LayerRow[] {
  const rows: LayerRow[] = [];
  const add = (layer: Layer, artboard: Artboard, depth: number, parentId: string | null) => {
    const children = childrenOf(layer);
    const open = children.length > 0 && expanded.has(layer.id);
    rows.push({
      id: layer.id,
      depth,
      layer,
      artboard,
      parentId,
      expandable: children.length > 0,
      expanded: open,
    });
    if (open) for (const child of children) add(child, artboard, depth + 1, layer.id);
  };
  for (const artboard of page.artboards) add(artboard, artboard, 0, null);
  return rows;
}

export function findLayer(page: Page, id: string): FoundLayer | undefined {
  const path: string[] = [];
  const search = (layer: Layer, artboard: Artboard): FoundLayer | undefined => {
    if (layer.id === id) return { layer, artboard, ancestors: [...path] };
    path.push(layer.id);
    for (const child of childrenOf(layer)) {
      const found = search(child, artboard);
      if (found !== undefined) return found;
    }
    path.pop();
    return undefined;
  };
  for (const artboard of page.artboards) {
    const found = search(artboard, artboard);
    if (found !== undefined) return found;
  }
  return undefined;
}
