import type { JsonPath } from './diagnostics';
import type { Artboard, FrameNode, Node, Page, VisionDocument } from './schema';

export type Container = Artboard | FrameNode;

export type Located =
  | { kind: 'page'; page: Page; index: number; path: JsonPath }
  | { kind: 'artboard'; page: Page; artboard: Artboard; index: number; path: JsonPath }
  | {
      kind: 'node';
      page: Page;
      artboard: Artboard;
      node: Node;
      parent: Container;
      index: number;
      path: JsonPath;
    };

export function* visit(doc: VisionDocument): Generator<Located> {
  for (const [pageIndex, page] of doc.pages.entries()) {
    const pagePath = ['pages', pageIndex];
    yield { kind: 'page', page, index: pageIndex, path: pagePath };
    for (const [artboardIndex, artboard] of page.artboards.entries()) {
      const artboardPath = [...pagePath, 'artboards', artboardIndex];
      yield { kind: 'artboard', page, artboard, index: artboardIndex, path: artboardPath };
      yield* visitChildren(page, artboard, artboard, artboardPath);
    }
  }
}

function* visitChildren(
  page: Page,
  artboard: Artboard,
  parent: Container,
  parentPath: JsonPath,
): Generator<Located> {
  for (const [index, node] of (parent.children ?? []).entries()) {
    const path = [...parentPath, 'children', index];
    yield { kind: 'node', page, artboard, node, parent, index, path };
    if (node.type === 'frame') yield* visitChildren(page, artboard, node, path);
  }
}

export function idOf(located: Located): string {
  switch (located.kind) {
    case 'page':
      return located.page.id;
    case 'artboard':
      return located.artboard.id;
    case 'node':
      return located.node.id;
  }
}

export function findById(doc: VisionDocument, id: string): Located | undefined {
  for (const located of visit(doc)) {
    if (idOf(located) === id) return located;
  }
  return undefined;
}

export function collectIds(doc: VisionDocument): Set<string> {
  return new Set(Array.from(visit(doc), idOf));
}

export function splitClasses(value: string | undefined): string[] {
  return value === undefined ? [] : value.split(/\s+/).filter((part) => part !== '');
}

export function collectClasses(doc: VisionDocument): string[] {
  const classes = new Set<string>();
  for (const located of visit(doc)) {
    const value = classOf(located);
    for (const name of splitClasses(value)) classes.add(name);
  }
  return [...classes].sort(compareStrings);
}

export function classOf(located: Located): string | undefined {
  switch (located.kind) {
    case 'page':
      return undefined;
    case 'artboard':
      return located.artboard.class;
    case 'node':
      return located.node.class;
  }
}

export function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const maxTextLength = 60;

export function outline(doc: VisionDocument, rootId?: string, maxDepth = Infinity): string {
  const lines: string[] = [];
  const write = (located: Located, depth: number): void => {
    if (depth <= maxDepth) lines.push('  '.repeat(depth) + describe(located));
  };
  if (rootId === undefined) {
    for (const located of visit(doc)) write(located, depthOf(located));
    return lines.join('\n');
  }
  const root = findById(doc, rootId);
  if (root === undefined) throw new Error(`No page, artboard or node has id "${rootId}"`);
  const rootDepth = depthOf(root);
  const rootPath = root.path.join('/');
  for (const located of visit(doc)) {
    const path = located.path.join('/');
    if (path === rootPath || path.startsWith(`${rootPath}/`)) {
      write(located, depthOf(located) - rootDepth);
    }
  }
  return lines.join('\n');
}

function depthOf(located: Located): number {
  return located.path.length / 2 - 1;
}

function describe(located: Located): string {
  switch (located.kind) {
    case 'page':
      return `page ${located.page.id}${field('name', located.page.name)}`;
    case 'artboard': {
      const { artboard } = located;
      const box = ` ${artboard.width}x${artboard.height} at ${artboard.x},${artboard.y}`;
      return `artboard ${artboard.id}${field('name', artboard.name)}${box}${field('class', artboard.class)}`;
    }
    case 'node':
      return describeNode(located.node);
  }
}

function describeNode(node: Node): string {
  const head = `${node.type} ${node.id}${field('name', node.name)}${field('class', node.class)}`;
  switch (node.type) {
    case 'frame':
      return head;
    case 'text':
      return head + field('text', truncate(node.text));
    case 'image':
      return head + field('src', node.src) + field('alt', node.alt);
    case 'svg':
      return head + field('icon', svgIconName(node.svg));
  }
}

/** The icon name an svg node drawn from `<i data-icon>` keeps in its markup. */
export function svgIconName(svg: string): string | undefined {
  return /^\s*<svg\b[^>]*?\sdata-icon="([^"]*)"/.exec(svg)?.[1];
}

function field(key: string, value: string | undefined): string {
  return value === undefined || value === '' ? '' : ` ${key}=${JSON.stringify(value)}`;
}

function truncate(text: string): string {
  return text.length > maxTextLength ? `${text.slice(0, maxTextLength - 1)}…` : text;
}
