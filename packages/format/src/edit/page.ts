import { generateId } from '../ids';
import type { Page, VisionDocument } from '../schema';
import { assertNewId } from './error';

export function createPage(
  doc: VisionDocument,
  options: { name: string; id?: string },
): { document: VisionDocument; page: Page } {
  if (options.id !== undefined) assertNewId(doc, options.id);
  const page: Page = {
    id: options.id ?? generateId(doc, options.name),
    name: options.name,
    artboards: [],
  };
  return { document: { ...doc, pages: [...doc.pages, page] }, page };
}
