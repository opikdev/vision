import { layerLabel } from '../label';
import type { Node } from '../schema';
import {
  finding,
  hasText,
  isPositioned,
  px,
  quote,
  shownBox,
  type ArtboardContext,
} from './context';
import type { Finding, MeasuredBox } from './schema';

const minOverlap = 2;

export function overlapRule(context: ArtboardContext): Finding[] {
  if (context.layout === undefined) return [];
  const parents: { id: string; children: Node[] }[] = [
    { id: context.artboard.id, children: context.artboard.children },
    ...context.nodes.flatMap(({ node }) =>
      node.type === 'frame' ? [{ id: node.id, children: node.children ?? [] }] : [],
    ),
  ];
  return parents.flatMap(({ id, children }) => siblingOverlaps(context, id, children));
}

function siblingOverlaps(context: ArtboardContext, parentId: string, children: Node[]): Finding[] {
  const parent = context.layout?.[parentId];
  const placed = children.flatMap((node) => {
    const box = shownBox(context, node.id);
    return box === undefined || !inFlow(box) ? [] : [{ node, box }];
  });
  const findings: Finding[] = [];
  for (const [index, first] of placed.entries()) {
    for (const second of placed.slice(index + 1)) {
      if (parent?.display.includes('grid') === true && stacked(first.box, second.box)) continue;
      const width =
        Math.min(first.box.x + first.box.width, second.box.x + second.box.width) -
        Math.max(first.box.x, second.box.x);
      const height =
        Math.min(first.box.y + first.box.height, second.box.y + second.box.height) -
        Math.max(first.box.y, second.box.y);
      if (width <= minOverlap || height <= minOverlap) continue;
      const covers = hasText(first.node) || hasText(second.node);
      findings.push(
        finding(
          context,
          'overlap',
          covers ? 'error' : 'warning',
          second.node.id,
          `${quote(layerLabel(second.node))} overlaps its sibling ${quote(layerLabel(first.node))} by ${px(width)} × ${px(height)}.`,
          'Give them room: remove fixed widths or heights, let the row wrap, or use gap instead of offsets. If the overlap is meant, position one of them with absolute.',
        ),
      );
    }
  }
  return findings;
}

function inFlow(box: MeasuredBox): boolean {
  return (
    !isPositioned(box) &&
    !box.transformed &&
    box.margin.every((margin) => margin === null || margin >= 0)
  );
}

function stacked(first: MeasuredBox, second: MeasuredBox): boolean {
  return first.gridArea === second.gridArea && first.gridArea !== 'auto / auto';
}
