import type { Artboard, Node, Page, VisionDocument } from '../schema';
import type { Finding, Layout, MeasuredBox, ReviewRule, ReviewSeverity } from './schema';

export interface ReviewNode {
  node: Node;
  /** Ids from the parent up to the artboard, nearest first. */
  ancestors: string[];
}

export interface ArtboardContext {
  document: VisionDocument;
  page: Page;
  artboard: Artboard;
  nodes: ReviewNode[];
  byId: Map<string, ReviewNode>;
  layout: Layout | undefined;
}

export type Rule = (context: ArtboardContext) => Finding[];

export function artboardContext(
  document: VisionDocument,
  page: Page,
  artboard: Artboard,
  layout: Layout | undefined,
): ArtboardContext {
  const nodes: ReviewNode[] = [];
  const walk = (children: Node[], ancestors: string[]): void => {
    for (const node of children) {
      nodes.push({ node, ancestors });
      if (node.type === 'frame') walk(node.children ?? [], [node.id, ...ancestors]);
    }
  };
  walk(artboard.children, [artboard.id]);
  return {
    document,
    page,
    artboard,
    nodes,
    byId: new Map(nodes.map((entry) => [entry.node.id, entry])),
    layout,
  };
}

export function finding(
  context: ArtboardContext,
  rule: ReviewRule,
  severity: ReviewSeverity,
  nodeId: string,
  message: string,
  fix?: string,
): Finding {
  const base = { rule, severity, artboardId: context.artboard.id, nodeId, message };
  return fix === undefined ? base : { ...base, fix };
}

export function shownBox(context: ArtboardContext, id: string): MeasuredBox | undefined {
  const box = context.layout?.[id];
  return box?.visible === true && box.width > 0 && box.height > 0 ? box : undefined;
}

export function isPositioned(box: MeasuredBox): boolean {
  return box.position === 'absolute' || box.position === 'fixed';
}

export function hasText(node: Node): boolean {
  if (node.type === 'text') return node.text.trim() !== '';
  if (node.type === 'frame') return (node.children ?? []).some(hasText);
  return false;
}

export function textOf(node: Node): string {
  if (node.type === 'text') return node.text;
  if (node.type === 'frame') return (node.children ?? []).map(textOf).join(' ');
  return '';
}

export function px(value: number): string {
  return `${Number(value.toFixed(1))}px`;
}

export function quote(text: string, max = 40): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return `"${line.length > max ? `${line.slice(0, max).trimEnd()}…` : line}"`;
}
