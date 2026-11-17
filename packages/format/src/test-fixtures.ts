import type { Artboard, Node, VisionDocument } from './schema';

export function artboard(id: string, overrides: Partial<Artboard> = {}): Artboard {
  return { id, name: id, x: 0, y: 0, width: 400, height: 300, children: [], ...overrides };
}

export function docWith(children: Node[], overrides: Partial<VisionDocument> = {}): VisionDocument {
  return {
    format: 'vision',
    version: 1,
    pages: [{ id: 'page', name: 'Page', artboards: [artboard('board', { children })] }],
    ...overrides,
  };
}
