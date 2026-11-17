import type { Artboard, Node, Page, Tokens, VisionDocument } from './schema';
import { tokenEntries } from './tokens';

type Json = string | number | boolean | Json[] | { [key: string]: Json };

export function serializeDocument(doc: VisionDocument): string {
  return `${JSON.stringify(documentJson(doc), null, 2)}\n`;
}

function documentJson(doc: VisionDocument): Json {
  return compact({
    format: doc.format,
    version: doc.version,
    tokens: tokensJson(doc.tokens),
    pages: doc.pages.map(pageJson),
  });
}

function tokensJson(tokens: Tokens | undefined): Json | undefined {
  const json: Record<string, Record<string, string>> = {};
  for (const [group, name, value] of tokenEntries(tokens)) {
    json[group] = { ...json[group], [name]: value };
  }
  return Object.keys(json).length === 0 ? undefined : json;
}

function pageJson(page: Page): Json {
  return { id: page.id, name: page.name, artboards: page.artboards.map(artboardJson) };
}

function artboardJson(artboard: Artboard): Json {
  return compact({
    id: artboard.id,
    name: artboard.name,
    x: artboard.x,
    y: artboard.y,
    width: artboard.width,
    height: artboard.height,
    class: optional(artboard.class),
    children: artboard.children.map(nodeJson),
  });
}

function nodeJson(node: Node): Json {
  const head = {
    type: node.type,
    id: node.id,
    name: optional(node.name),
    class: optional(node.class),
  };
  switch (node.type) {
    case 'frame':
      return compact({
        ...head,
        children: node.children?.length ? node.children.map(nodeJson) : undefined,
      });
    case 'text':
      return compact({ ...head, text: node.text });
    case 'image':
      return compact({ ...head, src: node.src, alt: optional(node.alt) });
    case 'svg':
      return compact({ ...head, svg: node.svg });
  }
}

function optional(value: string | undefined): string | undefined {
  return value === '' ? undefined : value;
}

function compact(object: Record<string, Json | undefined>): Json {
  return Object.fromEntries(
    Object.entries(object).filter((entry): entry is [string, Json] => entry[1] !== undefined),
  );
}
