import { parseFragment, serializeOuter, type DefaultTreeAdapterTypes } from 'parse5';
import { idProblem, uniqueId } from './ids';
import type { FrameNode, Node, TextNode } from './schema';
import { isSvgElement, sanitizeSvg } from './svg';

type Element = DefaultTreeAdapterTypes.Element;
type ChildNode = DefaultTreeAdapterTypes.ChildNode;

export class HtmlError extends Error {
  override name = 'HtmlError';
}

const frameTags = new Set([
  'div',
  'section',
  'header',
  'nav',
  'main',
  'footer',
  'aside',
  'article',
  'form',
  'ul',
  'ol',
  'li',
  'button',
]);

const textTags = new Set([
  'p',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'a',
  'strong',
  'em',
  'small',
  'b',
  'i',
  'u',
  's',
  'code',
  'mark',
  'sub',
  'sup',
  'time',
]);

const fieldTags = new Set(['input', 'textarea', 'select']);

const supportedTags =
  'div, section, header, nav, main, footer, aside, article, form, ul, ol, li, button, p, span, h1–h6, label, a, strong, em, small, img, svg, input, textarea and select';

export function htmlToNodes(html: string, takenIds: ReadonlySet<string>): Node[] {
  const fragment = parseFragment(html);
  const taken = new Set(takenIds);
  for (const child of fragment.childNodes) reserveIds(child, taken, takenIds);
  return convertChildren(fragment.childNodes, taken);
}

function reserveIds(node: ChildNode, taken: Set<string>, existing: ReadonlySet<string>): void {
  if (!isElement(node)) return;
  if (node.tagName === 'script' || node.tagName === 'style') {
    throw new HtmlError(
      `<${node.tagName}> isn't allowed. Designs can't run scripts; style elements with Tailwind classes instead.`,
    );
  }
  if (attribute(node, 'style') !== undefined) {
    throw new HtmlError(
      `The style attribute on <${node.tagName}> isn't allowed. Use Tailwind classes instead, with arbitrary values such as w-[320px] or bg-[#F4F1EA] when needed.`,
    );
  }
  const id = attribute(node, 'id');
  if (id !== undefined) {
    const problem = idProblem(id);
    if (problem !== undefined)
      throw new HtmlError(`Invalid id "${id}" on <${node.tagName}>. ${problem}`);
    if (taken.has(id)) {
      const where = existing.has(id) ? 'in the document' : 'earlier in this HTML';
      throw new HtmlError(
        `The id "${id}" is already used ${where}. Choose another id or leave it out.`,
      );
    }
    taken.add(id);
  }
  if (isSvgElement(node)) return;
  for (const child of node.childNodes) reserveIds(child, taken, existing);
}

function convertChildren(children: ChildNode[], taken: Set<string>): Node[] {
  const nodes: Node[] = [];
  let pending: string[] = [];
  const flush = (): void => {
    const text = finishText(pending);
    pending = [];
    if (text.trim() !== '') nodes.push(textNode(uniqueId('text', taken), undefined, text, taken));
  };
  for (const child of children) {
    if (child.nodeName === '#text' && 'value' in child) {
      pending.push(collapse(child.value));
    } else if (isElement(child) && child.tagName === 'br') {
      pending.push('\n');
    } else if (isElement(child)) {
      flush();
      nodes.push(convertElement(child, taken));
    }
  }
  flush();
  return nodes;
}

function convertElement(element: Element, taken: Set<string>): Node {
  const tag = element.tagName;
  if (isSvgElement(element)) return svgNode(element, taken);
  if (frameTags.has(tag))
    return frameNode(element, convertChildren(element.childNodes, taken), taken);
  if (textTags.has(tag)) {
    return isPlainText(element)
      ? textNode(
          idFor(element, taken),
          classOf(element),
          textContent(element),
          taken,
          nameOf(element),
        )
      : frameNode(element, convertChildren(element.childNodes, taken), taken);
  }
  if (tag === 'img') return imageNode(element, taken);
  if (fieldTags.has(tag)) return fieldNode(element, taken);
  throw new HtmlError(
    `<${tag}> isn't supported. Use ${supportedTags}; for other layouts use a <div> with Tailwind classes.`,
  );
}

function frameNode(element: Element, children: Node[], taken: Set<string>): FrameNode {
  const node: FrameNode = { type: 'frame', id: idFor(element, taken) };
  const name = nameOf(element);
  if (name !== undefined) node.name = name;
  const className = classOf(element);
  if (className !== undefined) node.class = className;
  if (children.length > 0) node.children = children;
  return node;
}

function textNode(
  id: string,
  className: string | undefined,
  text: string,
  taken: Set<string>,
  name?: string,
): TextNode {
  taken.add(id);
  return {
    type: 'text',
    id,
    ...(name === undefined ? {} : { name }),
    ...(className === undefined ? {} : { class: className }),
    text,
  };
}

function imageNode(element: Element, taken: Set<string>): Node {
  const src = attribute(element, 'src')?.trim() ?? '';
  if (src === '') {
    throw new HtmlError(
      '<img> needs a src: a path inside the assets folder, such as "photos/hero.jpg", or an https: URL.',
    );
  }
  const alt = attribute(element, 'alt');
  const className = classOf(element);
  const name = nameOf(element);
  return {
    type: 'image',
    id: idFor(element, taken),
    ...(name === undefined ? {} : { name }),
    ...(className === undefined ? {} : { class: className }),
    src,
    ...(alt === undefined || alt === '' ? {} : { alt }),
  };
}

function svgNode(element: Element, taken: Set<string>): Node {
  const id = idFor(element, taken);
  const name = nameOf(element);
  const className = classOf(element);
  element.attrs = element.attrs.filter(
    (attr) => attr.name !== 'id' && attr.name !== 'class' && attr.name !== 'data-name',
  );
  const svg = sanitizeSvg(serializeOuter(element));
  return {
    type: 'svg',
    id,
    ...(name === undefined ? {} : { name }),
    ...(className === undefined ? {} : { class: className }),
    svg,
  };
}

function fieldNode(element: Element, taken: Set<string>): FrameNode {
  const shown = fieldText(element);
  const children = shown === '' ? [] : [textNode(uniqueId('text', taken), undefined, shown, taken)];
  return frameNode(element, children, taken);
}

function fieldText(element: Element): string {
  switch (element.tagName) {
    case 'select': {
      const options = element.childNodes.filter(
        (child): child is Element => isElement(child) && child.tagName === 'option',
      );
      const selected = options.find((option) => attribute(option, 'selected') !== undefined);
      const option = selected ?? options[0];
      return option === undefined ? '' : textContent(option);
    }
    case 'textarea':
      return rawText(element).trim() || (attribute(element, 'placeholder') ?? '');
    default:
      return attribute(element, 'value') ?? attribute(element, 'placeholder') ?? '';
  }
}

function isPlainText(element: Element): boolean {
  return element.childNodes.every(
    (child) =>
      !isElement(child) ||
      child.tagName === 'br' ||
      (textTags.has(child.tagName) && isPlainText(child)),
  );
}

function textContent(element: Element): string {
  const parts: string[] = [];
  const walk = (node: ChildNode): void => {
    if (node.nodeName === '#text' && 'value' in node) parts.push(collapse(node.value));
    else if (isElement(node) && node.tagName === 'br') parts.push('\n');
    else if (isElement(node)) node.childNodes.forEach(walk);
  };
  element.childNodes.forEach(walk);
  return finishText(parts);
}

function rawText(element: Element): string {
  return element.childNodes
    .map((child) => (child.nodeName === '#text' && 'value' in child ? child.value : ''))
    .join('');
}

function collapse(text: string): string {
  return text.replace(/[ \t\n\r\f]+/g, ' ');
}

function finishText(parts: string[]): string {
  return parts
    .join('')
    .replace(/ {2,}/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/^ +| +$/g, '');
}

function idFor(element: Element, taken: Set<string>): string {
  const id = attribute(element, 'id') ?? uniqueId(element.tagName, taken);
  taken.add(id);
  return id;
}

function nameOf(element: Element): string | undefined {
  return ['data-name', 'aria-label', 'title']
    .map((name) => attribute(element, name)?.trim().replace(/\s+/g, ' ') ?? '')
    .find((value) => value !== '');
}

function classOf(element: Element): string | undefined {
  const value = attribute(element, 'class')?.trim().replace(/\s+/g, ' ');
  return value === '' ? undefined : value;
}

function attribute(element: Element, name: string): string | undefined {
  return element.attrs.find((attr) => attr.name === name && attr.namespace === undefined)?.value;
}

function isElement(node: ChildNode): node is Element {
  return 'tagName' in node;
}
