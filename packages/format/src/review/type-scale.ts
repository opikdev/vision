import { finding, px, quote, shownBox, type ArtboardContext } from './context';
import type { Finding, MeasuredBox } from './schema';

const maxSizes = 6;
const maxFamilies = 2;
const minSize = 12;
const maxRadii = 4;

export function typeScaleRule(context: ArtboardContext): Finding[] {
  if (context.layout === undefined) return [];
  const texts = context.nodes.flatMap(({ node }) => {
    if (node.type !== 'text' || node.text.trim() === '') return [];
    const box = shownBox(context, node.id);
    return box === undefined ? [] : [{ id: node.id, text: node.text, box }];
  });
  const findings: Finding[] = [];
  const { id: artboardId } = context.artboard;

  const sizes = distinct(texts.map(({ box }) => Math.round(box.fontSize * 2) / 2));
  if (sizes.length > maxSizes) {
    findings.push(
      finding(
        context,
        'type-scale',
        'warning',
        artboardId,
        `${sizes.length} font sizes (${sizes.map(px).join(', ')}); a clear hierarchy needs ${maxSizes} or fewer.`,
        'Pick a small type scale, such as 12/14/16/20/28/40px, set it as text tokens and use only those.',
      ),
    );
  }

  const small = texts.filter(({ box }) => box.fontSize < minSize);
  const [first] = small;
  if (first !== undefined) {
    findings.push(
      finding(
        context,
        'type-scale',
        'warning',
        first.id,
        small.length === 1
          ? `Text ${quote(first.text)} is ${px(first.box.fontSize)}, smaller than ${minSize}px.`
          : `${small.length} texts are smaller than ${minSize}px, such as ${quote(first.text)} at ${px(first.box.fontSize)}.`,
        `Use at least ${minSize}px; make secondary text quieter with color or weight instead of size.`,
      ),
    );
  }

  for (const { id, text, box } of texts) {
    const ratio = lineHeightRatio(box);
    if (ratio === undefined) continue;
    const least = box.fontSize >= 32 ? 0.95 : 1.15;
    if (ratio >= least && ratio <= 2) continue;
    findings.push(
      finding(
        context,
        'type-scale',
        'warning',
        id,
        `Text ${quote(text)} wraps with a line height of ${ratio.toFixed(2)} × its ${px(box.fontSize)} size; keep it between ${least} and 2.`,
        ratio < least
          ? 'Loosen it with leading-snug or leading-normal.'
          : 'Tighten it with leading-normal or leading-relaxed.',
      ),
    );
  }

  const families = distinct(texts.map(({ box }) => firstFamily(box.fontFamily)));
  if (families.length > maxFamilies) {
    findings.push(
      finding(
        context,
        'type-scale',
        'warning',
        artboardId,
        `${families.length} font families (${families.join(', ')}); use ${maxFamilies} at most.`,
        'Keep one family for text and at most one more for display or code, set as font tokens.',
      ),
    );
  }
  return findings;
}

export function radiiRule(context: ArtboardContext): Finding[] {
  if (context.layout === undefined) return [];
  const radii = distinct(
    context.nodes.flatMap(({ node }) => {
      const box = shownBox(context, node.id);
      if (box === undefined || box.radius <= 0) return [];
      if (box.radius >= Math.min(box.width, box.height) / 2) return [];
      return [Math.round(box.radius)];
    }),
  );
  if (radii.length <= maxRadii) return [];
  return [
    finding(
      context,
      'radii',
      'warning',
      context.artboard.id,
      `${radii.length} corner radii (${radii.map(px).join(', ')}); use ${maxRadii} or fewer.`,
      'Pick 2–3 radii (such as 6px for controls, 12px for cards), set them as radius tokens and use rounded-full for pills.',
    ),
  ];
}

function lineHeightRatio(box: MeasuredBox): number | undefined {
  if (box.lineHeight === null || box.fontSize === 0) return undefined;
  const lines = box.clientHeight / box.lineHeight;
  return lines >= 1.8 ? box.lineHeight / box.fontSize : undefined;
}

function firstFamily(list: string): string {
  return (list.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
}

function distinct<T extends string | number>(values: T[]): T[] {
  return [...new Set(values)].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)),
  );
}
