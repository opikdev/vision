import { HtmlError, htmlToNodes } from '../html';
import { collectIds, type Container } from '../query';
import type { Node, VisionDocument } from '../schema';
import { sanitizeSvg, SvgError } from '../svg';
import { containerOf, EditError, locate } from './error';

export interface InsertHtmlOptions {
  parent: string;
  html: string;
  index?: number;
  replace?: boolean;
}

export function insertHtml(
  doc: VisionDocument,
  options: InsertHtmlOptions,
): { document: VisionDocument; ids: string[] } {
  if (options.replace === true && options.index !== undefined) {
    throw new EditError('Pass either index or replace, not both.');
  }
  const document = structuredClone(doc);
  const parent = containerOf(locate(document, options.parent), 'parent');
  if (options.replace === true) parent.children = [];
  const nodes = convertHtml(options.html, collectIds(document));
  if (nodes.length === 0 && options.replace !== true) {
    throw new EditError('The HTML has no elements or text to insert.');
  }
  const children = parent.children ?? [];
  const index = options.index ?? children.length;
  assertIndex(index, children.length);
  children.splice(index, 0, ...nodes);
  setChildren(parent, children);
  return { document, ids: nodes.map((node) => node.id) };
}

function convertHtml(html: string, takenIds: ReadonlySet<string>): Node[] {
  try {
    return htmlToNodes(html, takenIds);
  } catch (error) {
    if (error instanceof HtmlError) throw new EditError(error.message, { cause: error });
    throw error;
  }
}

export interface NodePatch {
  name?: string | null;
  class?: string | null;
  text?: string | null;
  src?: string | null;
  alt?: string | null;
  svg?: string | null;
}

const editableFields = {
  frame: ['name', 'class'],
  text: ['name', 'class', 'text'],
  image: ['name', 'class', 'src', 'alt'],
  svg: ['name', 'class', 'svg'],
} as const satisfies Record<Node['type'], readonly (keyof NodePatch)[]>;

const clearableFields = new Set<keyof NodePatch>(['name', 'class', 'alt']);

export function updateNode(doc: VisionDocument, id: string, patch: NodePatch): VisionDocument {
  const document = structuredClone(doc);
  const located = locate(document, id);
  if (located.kind !== 'node') {
    const hint =
      located.kind === 'artboard'
        ? 'Use update_artboard for artboards.'
        : 'Pages have only a name.';
    throw new EditError(
      `"${id}" is ${located.kind === 'artboard' ? 'an artboard' : 'a page'}, not a node. ${hint}`,
    );
  }
  const { node } = located;
  const allowed: readonly (keyof NodePatch)[] = editableFields[node.type];
  for (const [field, value] of Object.entries(patch) as [
    keyof NodePatch,
    string | null | undefined,
  ][]) {
    if (value === undefined) continue;
    if (!allowed.includes(field)) {
      throw new EditError(
        `A ${node.type} node has no "${field}". Fields you can set on a ${node.type} node: ${allowed.join(', ')}.`,
      );
    }
    if (value === null) {
      if (!clearableFields.has(field)) {
        throw new EditError(
          `"${field}" is required on a ${node.type} node, so it can't be cleared. Pass a new value.`,
        );
      }
      clearField(node, field);
      continue;
    }
    (node as Partial<Record<keyof NodePatch, string>>)[field] =
      field === 'svg' ? cleanSvg(value) : value;
  }
  return document;
}

function clearField(node: Node, field: keyof NodePatch): void {
  if (field === 'name') delete node.name;
  else if (field === 'class') delete node.class;
  else if (node.type === 'image') delete node.alt;
}

function cleanSvg(svg: string): string {
  try {
    return sanitizeSvg(svg);
  } catch (error) {
    if (error instanceof SvgError) throw new EditError(error.message, { cause: error });
    throw error;
  }
}

export function moveNode(
  doc: VisionDocument,
  id: string,
  target: { parent: string; index?: number },
): VisionDocument {
  const document = structuredClone(doc);
  const located = locate(document, id);
  if (located.kind !== 'node') {
    throw new EditError(
      `"${id}" is ${located.kind === 'artboard' ? 'an artboard' : 'a page'}; only nodes can be moved. Use update_artboard to reposition an artboard.`,
    );
  }
  const destination = locate(document, target.parent);
  const parent = containerOf(destination, 'parent');
  if (destination.kind === 'node' && isWithin(destination.path, located.path)) {
    throw new EditError(
      `Can't move "${id}" into itself or one of its descendants. Choose a parent outside it.`,
    );
  }
  removeChild(located.parent, located.index);
  const children = parent.children ?? [];
  const index = target.index ?? children.length;
  assertIndex(index, children.length);
  children.splice(index, 0, located.node);
  setChildren(parent, children);
  return document;
}

export function removeChild(parent: Container, index: number): void {
  const children = parent.children ?? [];
  children.splice(index, 1);
  setChildren(parent, children);
}

function setChildren(parent: Container, children: Node[]): void {
  if ('width' in parent) parent.children = children;
  else if (children.length === 0) delete parent.children;
  else parent.children = children;
}

function isWithin(path: (string | number)[], ancestor: (string | number)[]): boolean {
  return ancestor.every((part, index) => path[index] === part);
}

function assertIndex(index: number, length: number): void {
  if (!Number.isInteger(index) || index < 0 || index > length) {
    throw new EditError(`index must be a whole number from 0 to ${length}, not ${index}.`);
  }
}
