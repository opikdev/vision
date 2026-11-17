import { idOf, visit, type Located } from './query';
import type { VisionDocument } from './schema';

export interface DocumentChange {
  change: 'added' | 'changed';
  located: Located;
}

export interface DocumentDiff {
  touched: DocumentChange[];
  removed: Located[];
}

export function diffDocuments(before: VisionDocument, after: VisionDocument): DocumentDiff {
  const previous = new Map<string, { located: Located; signature: string }>();
  for (const located of visit(before)) {
    previous.set(idOf(located), { located, signature: signatureOf(located) });
  }
  const touched: DocumentChange[] = [];
  for (const located of visit(after)) {
    const id = idOf(located);
    const was = previous.get(id);
    previous.delete(id);
    if (was === undefined) touched.push({ change: 'added', located });
    else if (was.signature !== signatureOf(located)) touched.push({ change: 'changed', located });
  }
  return { touched, removed: Array.from(previous.values(), ({ located }) => located) };
}

function signatureOf(located: Located): string {
  switch (located.kind) {
    case 'page':
      return JSON.stringify([located.page.name]);
    case 'artboard': {
      const { name, x, y, width, height } = located.artboard;
      return JSON.stringify([located.page.id, name, x, y, width, height, located.artboard.class]);
    }
    case 'node': {
      const { node } = located;
      return JSON.stringify([
        located.parent.id,
        node.type,
        node.class,
        node.type === 'text' ? node.text : null,
        node.type === 'image' ? [node.src, node.alt] : null,
        node.type === 'svg' ? node.svg : null,
      ]);
    }
  }
}
