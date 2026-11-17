import { layerLabel } from '../label';
import { finding, px, quote, shownBox, type ArtboardContext } from './context';
import type { Finding, MeasuredBox } from './schema';

const grid = 4;
const shown = 5;

interface OffGrid {
  nodeId: string;
  property: string;
  value: number;
  distance: number;
}

export function spacingRule(context: ArtboardContext): Finding[] {
  if (context.layout === undefined) return [];
  const offGrid: OffGrid[] = [];
  for (const { node } of context.nodes) {
    const box = shownBox(context, node.id);
    if (box === undefined) continue;
    for (const [property, value] of spacingValues(box)) {
      const size = Math.abs(value);
      if (size <= 2) continue;
      const remainder = size % grid;
      const distance = Math.min(remainder, grid - remainder);
      if (distance > 0.01) offGrid.push({ nodeId: node.id, property, value: size, distance });
    }
  }
  const [worst] = offGrid.toSorted(byDistance);
  if (worst === undefined) return [];
  const examples = distinctExamples(offGrid, context);
  const values = [...new Set(offGrid.map(({ value }) => value))].sort((a, b) => a - b);
  return [
    finding(
      context,
      'spacing',
      'warning',
      worst.nodeId,
      `${offGrid.length} spacing value${offGrid.length === 1 ? ' is' : 's are'} off the ${grid}px grid (${values.map(px).join(', ')}), such as ${examples.join('; ')}.`,
      `Use multiples of ${grid}px for padding, margin and gap (p-1 = 4px, p-2 = 8px, p-3 = 12px…), e.g. ${px(worst.value)} → ${px(Math.floor(worst.value / grid) * grid || grid)} or ${px(Math.ceil(worst.value / grid) * grid)}.`,
    ),
  ];
}

function byDistance(a: OffGrid, b: OffGrid): number {
  return b.distance - a.distance || a.value - b.value;
}

function spacingValues(box: MeasuredBox): [string, number][] {
  const sides = ['top', 'right', 'bottom', 'left'];
  const values: [string, number | null][] = [
    ...box.padding.map((value, index): [string, number] => [
      `padding-${sides[index] ?? ''}`,
      value,
    ]),
    ...box.margin.map((value, index): [string, number | null] => [
      `margin-${sides[index] ?? ''}`,
      value,
    ]),
  ];
  if (/flex|grid/.test(box.display))
    values.push(['row-gap', box.rowGap], ['column-gap', box.columnGap]);
  return values.filter((entry): entry is [string, number] => entry[1] !== null && entry[1] !== 0);
}

function distinctExamples(offGrid: OffGrid[], context: ArtboardContext): string[] {
  const seen = new Set<number>();
  const examples: string[] = [];
  for (const { nodeId, property, value } of offGrid.toSorted(byDistance)) {
    if (seen.has(value) || examples.length === shown) continue;
    seen.add(value);
    const node = context.byId.get(nodeId)?.node;
    examples.push(
      `${property} ${px(value)} on ${quote(node === undefined ? nodeId : layerLabel(node), 30)}`,
    );
  }
  return examples;
}
