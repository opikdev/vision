import type { Artboard, Node, Tokens } from '../schema';
import { artboard, docWith } from '../test-fixtures';
import { reviewDesign } from './review';
import type { Finding, Layout, MeasuredBox, ReviewRule } from './schema';

export function box(overrides: Partial<MeasuredBox> = {}): MeasuredBox {
  const { width = 100, height = 20 } = overrides;
  return {
    x: 0,
    y: 0,
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    scrollWidth: width,
    scrollHeight: height,
    visible: true,
    display: 'block',
    position: 'static',
    overflowX: 'visible',
    overflowY: 'visible',
    textOverflow: 'clip',
    lineClamp: false,
    transformed: false,
    gridArea: 'auto / auto',
    color: [0, 0, 0, 1],
    background: [0, 0, 0, 0],
    backgroundImage: false,
    borderWidth: 0,
    radius: 0,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 24,
    fontFamily: 'Inter, sans-serif',
    padding: [0, 0, 0, 0],
    margin: [0, 0, 0, 0],
    rowGap: null,
    columnGap: null,
    cursor: 'auto',
    ...overrides,
  };
}

export const text = (id: string, value: string, extra: Partial<Node> = {}): Node =>
  ({ type: 'text', id, text: value, ...extra }) as Node;

export const frame = (id: string, children: Node[] = [], extra: Partial<Node> = {}): Node =>
  ({ type: 'frame', id, children, ...extra }) as Node;

/** Findings of one rule for a 400×300 artboard "board" with a white root box, unless overridden. */
export function findingsOf(
  rule: ReviewRule,
  children: Node[],
  layout: Layout,
  { board = {}, tokens }: { board?: Partial<Artboard>; tokens?: Tokens } = {},
): Finding[] {
  const shape = artboard('board', { children, ...board });
  const document = docWith([], tokens === undefined ? {} : { tokens });
  const [page] = document.pages;
  if (page !== undefined) page.artboards = [shape];
  const root = box({ width: shape.width, height: shape.height, background: [255, 255, 255, 1] });
  const report = reviewDesign(document, { board: root, ...layout });
  return report.findings.filter((found) => found.rule === rule);
}
