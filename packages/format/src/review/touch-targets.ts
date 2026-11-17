import { layerLabel } from '../label';
import type { Node } from '../schema';
import { finding, px, quote, shownBox, textOf, type ArtboardContext } from './context';
import type { Finding, MeasuredBox } from './schema';

const maxMobileWidth = 480;
const minTarget = 44;
const controlTags = /^(button|a|input|select|textarea)([-_]\d+)?$/i;
const controlWords = new Set([
  'button',
  'btn',
  'cta',
  'link',
  'tab',
  'toggle',
  'switch',
  'checkbox',
  'radio',
]);

export function touchTargetRule(context: ArtboardContext): Finding[] {
  if (context.layout === undefined || context.artboard.width > maxMobileWidth) return [];
  const tappable = new Set<string>();
  const findings: Finding[] = [];
  for (const { node, ancestors } of context.nodes) {
    const box = shownBox(context, node.id);
    if (box === undefined || ancestors.some((id) => tappable.has(id))) continue;
    const control = isControl(node, box);
    if (control) tappable.add(node.id);
    if (!control && !(node.type === 'frame' && looksLikeButton(node, box))) continue;
    if (box.width >= minTarget && box.height >= minTarget) continue;
    findings.push(
      finding(
        context,
        'touch-target',
        'warning',
        node.id,
        `${quote(layerLabel(node))} looks tappable but is ${px(box.width)} × ${px(box.height)}; touch targets need at least ${minTarget} × ${minTarget}px.`,
        `Make it at least ${minTarget}px in both directions, such as min-h-11 min-w-11 or more padding.`,
      ),
    );
  }
  return findings;
}

function isControl(node: Node, box: MeasuredBox): boolean {
  if (controlTags.test(node.id) || box.cursor === 'pointer') return true;
  const words = `${node.id} ${node.name ?? ''}`.toLowerCase().split(/[^a-z0-9]+/);
  return words.some((word) => controlWords.has(word));
}

function looksLikeButton(node: Node, box: MeasuredBox): boolean {
  const label = textOf(node).replace(/\s+/g, ' ').trim();
  const filled = box.background[3] > 0 || box.borderWidth > 0;
  return (
    filled &&
    /\p{L}/u.test(label) &&
    label.length <= 24 &&
    label.split(' ').length <= 3 &&
    box.height > 28
  );
}
