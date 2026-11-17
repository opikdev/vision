import { contrastRatio, over, readableColor, toHex, white } from './color';
import { finding, quote, shownBox, type ArtboardContext, type ReviewNode } from './context';
import type { Finding, MeasuredBox, Rgba } from './schema';

const disabledPattern = /\b(disabled|inactive)\b/i;

export function contrastRule(context: ArtboardContext): Finding[] {
  if (context.layout === undefined) return [];
  const findings: Finding[] = [];
  const unmeasured = new Map<string, string[]>();
  for (const entry of context.nodes) {
    const { node } = entry;
    if (node.type !== 'text' || node.text.trim() === '') continue;
    const box = shownBox(context, node.id);
    if (box === undefined || box.color[3] === 0 || isDisabled(context, entry)) continue;
    const backdrop = backdropOf(context, entry, box);
    if (typeof backdrop === 'string') {
      unmeasured.set(backdrop, [...(unmeasured.get(backdrop) ?? []), node.text]);
      continue;
    }
    const color = over(box.color, backdrop);
    const ratio = contrastRatio(color, backdrop);
    const large = box.fontSize >= 24 || (box.fontSize >= 18.66 && box.fontWeight >= 700);
    const target = large ? 3 : 4.5;
    if (ratio >= target) continue;
    const better = readableColor(color, backdrop, target);
    findings.push(
      finding(
        context,
        'contrast',
        'error',
        node.id,
        `Text ${quote(node.text)} has contrast ${ratio.toFixed(2)}:1 (${toHex(color)} on ${toHex(backdrop)}); WCAG AA needs ${target}:1 for ${large ? 'large' : 'body'} text.`,
        better === undefined
          ? 'Change the text or background color.'
          : `Use a text color of ${toHex(better)} or ${better[0] < color[0] ? 'darker' : 'lighter'}, or a darker or lighter background.`,
      ),
    );
  }
  for (const [sourceId, texts] of unmeasured) {
    findings.push(
      finding(
        context,
        'contrast',
        'info',
        sourceId,
        texts.length === 1
          ? `Text ${quote(texts[0] ?? '')} sits over an image or gradient, so its contrast can't be measured.`
          : `${texts.length} texts sit over an image or gradient, so their contrast can't be measured.`,
        'Check them in a screenshot; add a solid or semi-opaque backdrop behind the text if they are hard to read.',
      ),
    );
  }
  return findings;
}

function isDisabled(context: ArtboardContext, entry: ReviewNode): boolean {
  return [entry.node.id, ...entry.ancestors].some((id) => {
    const node = context.byId.get(id)?.node;
    if (node === undefined) return false;
    const words = `${node.id.replace(/[-_]/g, ' ')} ${node.name ?? ''}`;
    return disabledPattern.test(words) || /\bcursor-not-allowed\b/.test(node.class ?? '');
  });
}

/** The solid color behind a text, or the id of the image or gradient it sits on. */
function backdropOf(context: ArtboardContext, entry: ReviewNode, box: MeasuredBox): Rgba | string {
  const chain = [entry.node.id, ...entry.ancestors];
  const layers: Rgba[] = [];
  let opaque: string | undefined;
  for (const id of chain) {
    const ancestor = context.layout?.[id];
    if (ancestor === undefined) continue;
    if (ancestor.backgroundImage) return id;
    if (ancestor.background[3] > 0) layers.push(ancestor.background);
    if (ancestor.background[3] === 1) {
      opaque = id;
      break;
    }
  }
  const behind = imageBehind(context, chain, opaque, box);
  if (behind !== undefined) return behind;
  return layers.reduceRight<Rgba>((backdrop, layer) => over(layer, backdrop), white);
}

function imageBehind(
  context: ArtboardContext,
  chain: string[],
  opaque: string | undefined,
  box: MeasuredBox,
): string | undefined {
  for (const { node, ancestors } of context.nodes) {
    if (chain.includes(node.id) || (opaque !== undefined && !ancestors.includes(opaque))) continue;
    const other = shownBox(context, node.id);
    if (other === undefined || !(node.type === 'image' || other.backgroundImage)) continue;
    const overlapX = Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x);
    const overlapY =
      Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y);
    if (overlapX > 1 && overlapY > 1) return node.id;
  }
  return undefined;
}
