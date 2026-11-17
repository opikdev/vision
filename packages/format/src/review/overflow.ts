import { layerLabel } from '../label';
import {
  finding,
  hasText,
  isPositioned,
  px,
  quote,
  shownBox,
  textOf,
  type ArtboardContext,
  type ReviewNode,
} from './context';
import type { Finding, MeasuredBox } from './schema';

const tolerance = 1;
const clipping = new Set(['hidden', 'clip']);

export function overflowRule(context: ArtboardContext): Finding[] {
  if (context.layout === undefined) return [];
  return [
    ...pastArtboardBottom(context),
    ...context.nodes.flatMap((entry) => [
      ...outsideArtboard(context, entry),
      ...clippedText(context, entry),
      ...spilledText(context, entry),
      ...spilledChildren(context, entry),
    ]),
  ];
}

function inFlowAndUnclipped(context: ArtboardContext, entry: ReviewNode): boolean {
  const box = context.layout?.[entry.node.id];
  if (box === undefined || isPositioned(box)) return false;
  return entry.ancestors.every((id) => {
    const ancestor = context.layout?.[id];
    if (ancestor === undefined || id === context.artboard.id) return true;
    return !isPositioned(ancestor) && !clips(ancestor);
  });
}

function clips(box: MeasuredBox): boolean {
  return box.overflowX !== 'visible' || box.overflowY !== 'visible';
}

function pastArtboardBottom(context: ArtboardContext): Finding[] {
  const { artboard } = context;
  let bottom = artboard.height;
  let lowest: ReviewNode | undefined;
  for (const entry of context.nodes) {
    const box = shownBox(context, entry.node.id);
    if (box === undefined || !draws(entry, box) || !inFlowAndUnclipped(context, entry)) continue;
    if (box.y + box.height > bottom + tolerance) {
      bottom = box.y + box.height;
      lowest = entry;
    }
  }
  if (lowest === undefined) return [];
  const needed = Math.ceil(bottom);
  return [
    finding(
      context,
      'overflow',
      'error',
      artboard.id,
      `Content runs to y=${needed} but the artboard is ${artboard.height}px tall, so ${quote(layerLabel(lowest.node))} and anything below ${artboard.height}px is cut off.`,
      `Make the artboard ${needed}px tall with update_artboard, or tighten the layout.`,
    ),
  ];
}

function draws({ node }: ReviewNode, box: MeasuredBox): boolean {
  if (node.type !== 'frame') return true;
  const empty = (node.children ?? []).length === 0;
  return empty && (box.background[3] > 0 || box.borderWidth > 0 || box.backgroundImage);
}

function outsideArtboard(context: ArtboardContext, entry: ReviewNode): Finding[] {
  const box = shownBox(context, entry.node.id);
  if (box === undefined || !inFlowAndUnclipped(context, entry)) return [];
  const { width } = context.artboard;
  const sticksOut = (candidate: MeasuredBox) =>
    candidate.x < -tolerance || candidate.x + candidate.width > width + tolerance;
  if (!sticksOut(box)) return [];
  const parent = context.layout?.[entry.ancestors[0] ?? ''];
  if (parent !== undefined && entry.ancestors[0] !== context.artboard.id && sticksOut(parent)) {
    return [];
  }
  const right = box.x + box.width;
  return [
    finding(
      context,
      'overflow',
      'error',
      entry.node.id,
      `${quote(layerLabel(entry.node))} spans x=${Math.round(box.x)} to x=${Math.round(right)}, outside the ${width}px-wide artboard, so part of it is cut off.`,
      `Keep it within the artboard: constrain its width (w-full, max-w-*, min-w-0) or let its content wrap.`,
    ),
  ];
}

function clippedText(context: ArtboardContext, entry: ReviewNode): Finding[] {
  const { node } = entry;
  const box = shownBox(context, node.id);
  if (box === undefined) return [];
  const clipsX = clipping.has(box.overflowX) && box.scrollWidth > box.clientWidth + tolerance;
  const clipsY = clipping.has(box.overflowY) && box.scrollHeight > box.clientHeight + tolerance;
  if (!clipsX && !clipsY) return [];
  if (node.type === 'text') {
    if (truncatesOnPurpose(box)) {
      return [
        finding(
          context,
          'overflow',
          'warning',
          node.id,
          `Text ${quote(node.text)} is truncated: it needs ${px(box.lineClamp ? box.scrollHeight : box.scrollWidth)} but has ${px(box.lineClamp ? box.clientHeight : box.clientWidth)}.`,
          'Shorten the text or give it more room, so the full text shows in the design.',
        ),
      ];
    }
    return [clippedFinding(context, node.id, node.text, box, clipsY)];
  }
  if (node.type !== 'frame') return [];
  const cut = context.nodes.find(
    (inner) =>
      inner.node.type === 'text' &&
      inner.ancestors.includes(node.id) &&
      hasText(inner.node) &&
      sticksOutOf(shownBox(context, inner.node.id), box),
  );
  if (cut === undefined) return [];
  return [clippedFinding(context, node.id, textOf(cut.node), box, clipsY)];
}

function truncatesOnPurpose(box: MeasuredBox): boolean {
  return box.textOverflow === 'ellipsis' || box.lineClamp;
}

function clippedFinding(
  context: ArtboardContext,
  nodeId: string,
  text: string,
  box: MeasuredBox,
  vertical: boolean,
): Finding {
  const needed = vertical ? box.scrollHeight : box.scrollWidth;
  const shown = vertical ? box.clientHeight : box.clientWidth;
  return finding(
    context,
    'overflow',
    'error',
    nodeId,
    `Text ${quote(text)} is cut off: its content needs ${px(needed)} ${vertical ? 'of height' : 'of width'} but the box shows ${px(shown)}.`,
    vertical
      ? 'Remove the fixed height (use min-h-* or let it grow) or shorten the text.'
      : 'Let the text wrap, widen the box, or shorten the text.',
  );
}

function beyondArtboard(context: ArtboardContext, box: MeasuredBox): boolean {
  const { width, height } = context.artboard;
  return (
    box.x < -tolerance ||
    box.y < -tolerance ||
    box.x + box.width > width + tolerance ||
    box.y + box.height > height + tolerance
  );
}

function sticksOutOf(inner: MeasuredBox | undefined, outer: MeasuredBox): boolean {
  if (inner === undefined) return false;
  return (
    inner.x < outer.x - tolerance ||
    inner.y < outer.y - tolerance ||
    inner.x + inner.width > outer.x + outer.width + tolerance ||
    inner.y + inner.height > outer.y + outer.height + tolerance
  );
}

function spilledText(context: ArtboardContext, entry: ReviewNode): Finding[] {
  const { node } = entry;
  if (node.type !== 'text' || node.text.trim() === '') return [];
  const box = shownBox(context, node.id);
  if (box === undefined || clips(box)) return [];
  const wide = box.scrollWidth > box.clientWidth + tolerance;
  // Tight leading lets glyphs poke out of their line boxes by a fraction of the font size, harmlessly.
  const tall = box.scrollHeight > box.clientHeight + Math.max(tolerance, box.fontSize / 4);
  if (!wide && !tall) return [];
  return [
    finding(
      context,
      'overflow',
      'warning',
      node.id,
      wide
        ? `Text ${quote(node.text)} is ${px(box.scrollWidth)} wide but its box is ${px(box.clientWidth)}, so it spills out.`
        : `Text ${quote(node.text)} is ${px(box.scrollHeight)} tall but its box is ${px(box.clientHeight)}, so it spills out.`,
      wide
        ? 'Let the text wrap (remove whitespace-nowrap, add min-w-0 to flex parents) or give it more width.'
        : 'Remove the fixed height so the box grows with its text.',
    ),
  ];
}

function spilledChildren(context: ArtboardContext, entry: ReviewNode): Finding[] {
  const { node } = entry;
  if (node.type !== 'frame') return [];
  const box = shownBox(context, node.id);
  if (box === undefined || clips(box)) return [];
  const findings: Finding[] = [];
  for (const child of node.children ?? []) {
    const inner = shownBox(context, child.id);
    if (inner === undefined || isPositioned(inner) || inner.transformed) continue;
    if (inner.margin.some((margin) => margin !== null && margin < 0)) continue;
    if (beyondArtboard(context, inner)) continue;
    const spill = Math.max(
      box.x - inner.x,
      box.y - inner.y,
      inner.x + inner.width - (box.x + box.width),
      inner.y + inner.height - (box.y + box.height),
    );
    if (spill <= 2) continue;
    findings.push(
      finding(
        context,
        'overflow',
        'warning',
        child.id,
        `${quote(layerLabel(child))} spills ${px(spill)} out of its parent ${quote(layerLabel(node))}.`,
        'Let it shrink (min-w-0, flex-1 instead of fixed widths), wrap, or give the parent room for it.',
      ),
    );
  }
  return findings;
}
