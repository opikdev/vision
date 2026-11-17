import type { Node, VisionDocument } from '@vision/format';

export function reuseUnchanged(
  previous: VisionDocument | null,
  next: VisionDocument | null,
): VisionDocument | null {
  if (previous === null || next === null || previous === next) return next;
  const old = indexById(previous);
  const reuse = <T extends { id: string }>(item: T): T => {
    const before = old.get(item.id);
    return before !== undefined && sameFields(before, item) ? (before as T) : item;
  };
  const nodes = (list: Node[]): Node[] =>
    list.map((node) =>
      reuse(
        node.type === 'frame' && node.children !== undefined
          ? { ...node, children: nodes(node.children) }
          : node,
      ),
    );
  const document: VisionDocument = {
    ...next,
    pages: next.pages.map((page) =>
      reuse({
        ...page,
        artboards: page.artboards.map((artboard) =>
          reuse({ ...artboard, children: nodes(artboard.children) }),
        ),
      }),
    ),
  };
  if (
    previous.tokens !== undefined &&
    JSON.stringify(next.tokens) === JSON.stringify(previous.tokens)
  )
    document.tokens = previous.tokens;
  return sameFields(previous, document) ? previous : document;
}

function indexById(document: VisionDocument): Map<string, object> {
  const index = new Map<string, object>();
  const add = (nodes: Node[]) => {
    for (const node of nodes) {
      index.set(node.id, node);
      if (node.type === 'frame' && node.children !== undefined) add(node.children);
    }
  };
  for (const page of document.pages) {
    index.set(page.id, page);
    for (const artboard of page.artboards) {
      index.set(artboard.id, artboard);
      add(artboard.children);
    }
  }
  return index;
}

function sameFields(a: object, b: object): boolean {
  const before = a as Record<string, unknown>;
  const after = b as Record<string, unknown>;
  const keys = Object.keys(after);
  return (
    keys.length === Object.keys(before).length &&
    keys.every((key) => {
      const x = before[key];
      const y = after[key];
      return (
        x === y ||
        (Array.isArray(x) &&
          Array.isArray(y) &&
          x.length === y.length &&
          x.every((item, index) => item === y[index]))
      );
    })
  );
}
