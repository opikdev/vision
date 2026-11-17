import { generateId } from '../ids';
import type { Artboard, Page, VisionDocument } from '../schema';
import { nextArtboardX } from '../validate';
import { assertCoordinate, assertNewId, assertSize, EditError, locate } from './error';

export interface CreateArtboardOptions {
  page?: string;
  name: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  class?: string;
  id?: string;
}

export function createArtboard(
  doc: VisionDocument,
  options: CreateArtboardOptions,
): { document: VisionDocument; artboard: Artboard } {
  const document = structuredClone(doc);
  const page = targetPage(document, options.page);
  if (options.id !== undefined) assertNewId(document, options.id);
  assertSize('width', options.width);
  assertSize('height', options.height);
  const x = options.x ?? nextArtboardX(page);
  const y = options.y ?? page.artboards[0]?.y ?? 0;
  assertCoordinate('x', x);
  assertCoordinate('y', y);
  const artboard: Artboard = {
    id: options.id ?? generateId(document, options.name),
    name: options.name,
    x,
    y,
    width: options.width,
    height: options.height,
    ...(options.class === undefined ? {} : { class: options.class }),
    children: [],
  };
  page.artboards.push(artboard);
  return { document, artboard };
}

function targetPage(document: VisionDocument, pageId: string | undefined): Page {
  if (pageId !== undefined) {
    const located = locate(document, pageId);
    if (located.kind !== 'page') {
      throw new EditError(
        `"${pageId}" is ${located.kind === 'artboard' ? 'an artboard' : 'a node'}, not a page. Pass a page id.`,
      );
    }
    return located.page;
  }
  const first = document.pages[0];
  if (first !== undefined) return first;
  const page: Page = { id: generateId(document, 'page'), name: 'Page 1', artboards: [] };
  document.pages.push(page);
  return page;
}

export interface ArtboardPatch {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  class?: string | null;
}

export function updateArtboard(
  doc: VisionDocument,
  id: string,
  patch: ArtboardPatch,
): VisionDocument {
  const document = structuredClone(doc);
  const located = locate(document, id);
  if (located.kind !== 'artboard') {
    throw new EditError(
      `"${id}" is ${located.kind === 'page' ? 'a page' : 'a node'}, not an artboard. Pass an artboard id.`,
    );
  }
  const { artboard } = located;
  if (patch.name !== undefined) artboard.name = patch.name;
  for (const field of ['x', 'y'] as const) {
    const value = patch[field];
    if (value === undefined) continue;
    assertCoordinate(field, value);
    artboard[field] = value;
  }
  for (const field of ['width', 'height'] as const) {
    const value = patch[field];
    if (value === undefined) continue;
    assertSize(field, value);
    artboard[field] = value;
  }
  if (patch.class === null) delete artboard.class;
  else if (patch.class !== undefined) artboard.class = patch.class;
  return document;
}
