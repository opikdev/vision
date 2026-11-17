import type { Artboard, Node, VisionDocument } from '@vision/format';

export interface DesignStyle {
  key: string;
  tokens: string;
  classes: ReadonlySet<string>;
}

const artboardClassCache = new WeakMap<Artboard, readonly string[]>();

export function designStyle(document: VisionDocument): DesignStyle {
  const classes = new Set<string>();
  for (const page of document.pages) {
    for (const artboard of page.artboards) {
      for (const name of artboardClasses(artboard)) classes.add(name);
    }
  }
  const tokens = JSON.stringify(document.tokens ?? null);
  return { key: `${tokens}\n${[...classes].sort().join(' ')}`, tokens, classes };
}

export function covers(style: DesignStyle, next: DesignStyle, artboard: Artboard): boolean {
  return (
    style.tokens === next.tokens &&
    artboardClasses(artboard).every((name) => style.classes.has(name))
  );
}

function artboardClasses(artboard: Artboard): readonly string[] {
  let classes = artboardClassCache.get(artboard);
  if (classes === undefined) {
    const found = new Set<string>();
    const add = (value: string | undefined) => {
      for (const name of value?.split(/\s+/) ?? []) if (name !== '') found.add(name);
    };
    const visit = (nodes: Node[]) => {
      for (const node of nodes) {
        add(node.class);
        if (node.type === 'frame' && node.children !== undefined) visit(node.children);
      }
    };
    add(artboard.class);
    visit(artboard.children);
    classes = [...found];
    artboardClassCache.set(artboard, classes);
  }
  return classes;
}
