import type { Artboard, FrameNode, Node, Page } from './schema';

const maxTextLength = 40;
const maxLabelLength = 47;

const roleWords: Record<string, string> = {
  nav: 'Navigation',
  header: 'Header',
  footer: 'Footer',
  main: 'Main',
  section: 'Section',
  article: 'Article',
  aside: 'Aside',
  ul: 'List',
  ol: 'List',
  li: 'List item',
  form: 'Form',
  button: 'Button',
  a: 'Link',
  table: 'Table',
  label: 'Label',
  input: 'Field',
  textarea: 'Field',
  select: 'Field',
  h1: 'Heading',
  h2: 'Heading',
  h3: 'Heading',
  h4: 'Heading',
  h5: 'Heading',
  h6: 'Heading',
};

const htmlTags = new Set([
  ...Object.keys(roleWords),
  'div',
  'span',
  'p',
  'img',
  'svg',
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
  'br',
  'hr',
  'figure',
  'figcaption',
  'picture',
  'video',
  'blockquote',
  'pre',
  'option',
  'tr',
  'td',
  'th',
  'thead',
  'tbody',
]);

const genericWords = new Set([
  'frame',
  'text',
  'image',
  'img',
  'svg',
  'node',
  'layer',
  'element',
  'el',
  'group',
  'box',
  'item',
]);

/** A short, readable label for a layer: its name, or one derived from its content, id and classes. */
export function layerLabel(layer: Node | Artboard | Page): string {
  return truncate(labelOf(layer), maxLabelLength);
}

function labelOf(layer: Node | Artboard | Page): string {
  if (!('type' in layer)) return layer.name;
  const name = layer.name?.trim() ?? '';
  if (name !== '') return name;
  switch (layer.type) {
    case 'text':
      return textLabel(layer.text) ?? 'Text';
    case 'image':
      return (
        [layer.alt?.trim() ?? '', fileName(layer.src)].find((label) => label !== '') ?? 'Image'
      );
    case 'svg':
      return svgLabel(layer.svg) ?? 'Icon';
    case 'frame':
      return frameLabel(layer);
  }
}

function frameLabel(frame: FrameNode): string {
  const texts = subtreeTexts(frame);
  const [only] = texts;
  if (texts.length === 1 && only !== undefined && hasLetter(only)) return only;
  const tag = generatedTag(frame.id);
  if (tag === undefined) return humanize(frame.id);
  const role = roleWords[tag] ?? layoutWord(frame.class);
  const first = texts.find(hasLetter);
  return first === undefined ? role : `${role} · ${first}`;
}

function generatedTag(id: string): string | undefined {
  const word = /^([a-z][a-z0-9]*)(?:[-_]\d+)?$/i.exec(id)?.[1]?.toLowerCase();
  return word !== undefined && (htmlTags.has(word) || genericWords.has(word)) ? word : undefined;
}

function subtreeTexts(frame: FrameNode): string[] {
  const texts: string[] = [];
  const walk = (nodes: Node[]): void => {
    for (const node of nodes) {
      if (node.type === 'text') {
        const text = textLabel(node.text);
        if (text !== undefined) texts.push(text);
      } else if (node.type === 'frame') walk(node.children ?? []);
    }
  };
  walk(frame.children ?? []);
  return texts;
}

function layoutWord(className: string | undefined): string {
  const classes = new Set(className?.split(/\s+/));
  if (classes.has('grid') || classes.has('inline-grid')) return 'Grid';
  if (classes.has('flex') || classes.has('inline-flex'))
    return classes.has('flex-col') ? 'Column' : 'Row';
  return 'Frame';
}

function textLabel(text: string): string | undefined {
  const line = text
    .split('\n')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .find((part) => part !== '');
  return line === undefined ? undefined : truncate(line, maxTextLength);
}

function fileName(src: string): string {
  const path = src.trim().replace(/[?#].*$/, '');
  const last =
    path
      .split('/')
      .filter((part) => part !== '')
      .at(-1) ?? '';
  if (/^https?:$/i.test(last)) return '';
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function svgLabel(markup: string): string | undefined {
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(markup)?.[1];
  const ariaLabel = /^\s*<svg\b[^>]*?\saria-label\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(markup);
  for (const candidate of [title, ariaLabel?.[1] ?? ariaLabel?.[2]]) {
    const text = decodeEntities(candidate?.replace(/<[^>]*>/g, '') ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    if (text !== '') return text;
  }
  return undefined;
}

function decodeEntities(text: string): string {
  const entities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    '#39': "'",
  };
  return text.replace(
    /&(amp|lt|gt|quot|apos|#39);/g,
    (_match, name: string) => entities[name] ?? '',
  );
}

function humanize(id: string): string {
  const words = id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[-_\s]+/)
    .filter((word) => word !== '')
    .filter((word, index, all) => index > 0 || word.length > 1 || all.length === 1)
    .map((word) => (word.length > 1 && word === word.toUpperCase() ? word : word.toLowerCase()));
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function hasLetter(text: string): boolean {
  return /\p{L}/u.test(text);
}

function truncate(text: string, keep: number): string {
  return text.length > keep ? `${text.slice(0, keep).trimEnd()}…` : text;
}
