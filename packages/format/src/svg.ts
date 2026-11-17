import { html, parseFragment, serializeOuter, type DefaultTreeAdapterTypes } from 'parse5';

type Element = DefaultTreeAdapterTypes.Element;
type ChildNode = DefaultTreeAdapterTypes.ChildNode;

export class SvgError extends Error {
  override name = 'SvgError';
}

const removedElements = new Set(['script', 'foreignObject', 'style']);

const sanitized = new Map<string, string>();
const maxSanitized = 1000;

// Designs repeat the same icons, and both validation and drawing sanitize every one on each save.
export function sanitizeSvg(svg: string): string {
  let result = sanitized.get(svg);
  if (result === undefined) {
    result = sanitizeOnce(svg);
    if (sanitized.size >= maxSanitized) sanitized.clear();
    sanitized.set(svg, result);
  }
  return result;
}

function sanitizeOnce(svg: string): string {
  const roots = parseFragment(svg).childNodes.filter(isSignificant);
  const root = roots[0];
  if (roots.length !== 1 || root === undefined || !isElement(root) || !isSvgElement(root)) {
    throw new SvgError(
      `Expected a single <svg> element, got ${describe(roots)}. Wrap the drawing in one <svg viewBox="…">…</svg>.`,
    );
  }
  sanitizeElement(root);
  return serializeOuter(root);
}

export function isSvgElement(element: Element): boolean {
  return element.tagName === 'svg' && element.namespaceURI === html.NS.SVG;
}

function sanitizeElement(element: Element): void {
  element.attrs = element.attrs.filter((attr) => isSafeAttribute(attr.name, attr.value));
  element.childNodes = element.childNodes.filter(
    (child) =>
      !isElement(child) || (child.namespaceURI === html.NS.SVG && !isRemovedElement(child)),
  );
  for (const child of element.childNodes) {
    if (isElement(child)) sanitizeElement(child);
  }
}

function isRemovedElement(element: Element): boolean {
  if (removedElements.has(element.tagName)) return true;
  const animated = element.attrs.find((attr) => attr.name === 'attributeName')?.value ?? '';
  return /^(set|animate)/.test(element.tagName) && /href$/i.test(animated);
}

function isSafeAttribute(name: string, value: string): boolean {
  if (/^on/i.test(name)) return false;
  if (name === 'href') return value.trim().startsWith('#');
  return !/url\(\s*['"]?\s*(?!#)/i.test(value);
}

function isSignificant(node: ChildNode): boolean {
  if (node.nodeName === '#comment') return false;
  return !(node.nodeName === '#text' && 'value' in node && node.value.trim() === '');
}

function isElement(node: ChildNode): node is Element {
  return 'tagName' in node;
}

function describe(nodes: ChildNode[]): string {
  if (nodes.length === 0) return 'nothing';
  if (nodes.length > 1) return `${nodes.length} top-level nodes`;
  const [node] = nodes;
  return node !== undefined && isElement(node) ? `<${node.tagName}>` : 'text';
}
