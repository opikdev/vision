import type { Artboard, Node, VisionDocument } from '@vision/format';

const artboardClasses = new WeakMap<Artboard, string[]>();

export function styleKey(document: VisionDocument): string {
  const classes = new Set<string>();
  for (const page of document.pages) {
    for (const artboard of page.artboards) {
      for (const name of classesOf(artboard)) classes.add(name);
    }
  }
  return JSON.stringify([document.tokens ?? null, [...classes].sort()]);
}

function classesOf(artboard: Artboard): string[] {
  let classes = artboardClasses.get(artboard);
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
    artboardClasses.set(artboard, classes);
  }
  return classes;
}
