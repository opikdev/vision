import type { VisionDocument } from '../schema';
import { EditError, locate } from './error';
import { removeChild } from './node';

export function deleteById(doc: VisionDocument, id: string): VisionDocument {
  const document = structuredClone(doc);
  const located = locate(document, id);
  switch (located.kind) {
    case 'page':
      if (document.pages.length === 1) {
        throw new EditError(
          `Can't delete "${id}", the only page. A design needs at least one page; add another page first.`,
        );
      }
      document.pages.splice(located.index, 1);
      break;
    case 'artboard':
      located.page.artboards.splice(located.index, 1);
      break;
    case 'node':
      removeChild(located.parent, located.index);
      break;
  }
  return document;
}
