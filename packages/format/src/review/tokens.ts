import { splitClasses } from '../query';
import type { TokenGroup } from '../schema';
import { parseHexColor } from './color';
import { finding, type ArtboardContext } from './context';
import type { Finding } from './schema';

const colorPrefixes = new Set([
  'bg',
  'text',
  'border',
  'border-x',
  'border-y',
  'border-t',
  'border-r',
  'border-b',
  'border-l',
  'border-s',
  'border-e',
  'outline',
  'ring',
  'ring-offset',
  'fill',
  'stroke',
  'decoration',
  'accent',
  'caret',
  'divide',
  'from',
  'via',
  'to',
  'shadow',
  'placeholder',
]);
const radiusPrefix = /^rounded(-(t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?$/;
const spacingPrefix = /^(p[xytrblse]?|m[xytrblse]?|gap(-[xy])?|space-[xy])$/;
const arbitrary = /^(-?)([a-z]+(?:-[a-z]+)*)-\[([^\]]+)\](\/[\w.[\]%]+)?$/;
const lengthValue = /^-?\d*\.?\d+[a-z%]+$/;

interface RawValue {
  className: string;
  group: TokenGroup;
  value: string;
  replacement: (token: string) => string;
}

export function tokensRule(context: ArtboardContext): Finding[] {
  const tokens = context.document.tokens;
  const findings: Finding[] = [];
  if (Object.keys(tokens?.color ?? {}).length === 0) {
    findings.push(
      finding(
        context,
        'tokens',
        'info',
        context.artboard.id,
        'The design has no color tokens, so its colors are raw values repeated by hand.',
        'Set a small palette (such as brand, surface, fg, fg-muted, line) with set_tokens and use its classes (bg-brand, text-fg-muted).',
      ),
    );
  }
  const uses = new Map<string, { raw: RawValue; token: string; nodeIds: string[] }>();
  const classOwners: [string, string | undefined][] = [
    [context.artboard.id, context.artboard.class],
    ...context.nodes.map(({ node }): [string, string | undefined] => [node.id, node.class]),
  ];
  for (const [nodeId, classes] of classOwners) {
    for (const className of splitClasses(classes)) {
      const raw = rawValue(className);
      if (raw === undefined) continue;
      const token = matchingToken(tokens?.[raw.group] ?? {}, raw);
      if (token === undefined) continue;
      const use = uses.get(className) ?? { raw, token, nodeIds: [] };
      use.nodeIds.push(nodeId);
      uses.set(className, use);
    }
  }
  for (const [className, { raw, token, nodeIds }] of uses) {
    const [first] = nodeIds;
    if (first === undefined) continue;
    findings.push(
      finding(
        context,
        'tokens',
        'warning',
        first,
        `${className} ${nodeIds.length === 1 ? 'repeats' : `on ${nodeIds.length} layers repeats`} the ${raw.group} token "${token}".`,
        `Use ${raw.replacement(token)} instead.`,
      ),
    );
  }
  return findings;
}

function rawValue(className: string): RawValue | undefined {
  const parts = splitVariants(className);
  const utility = parts.pop() ?? '';
  const important = utility.startsWith('!') ? '!' : '';
  const match = arbitrary.exec(utility.slice(important.length));
  if (match === null) return undefined;
  const [, negative = '', prefix = '', inner = '', modifier = ''] = match;
  const value = inner
    .replace(/^(color|length):/, '')
    .replace(/_/g, ' ')
    .trim();
  const isColor =
    parseHexColor(value) !== undefined || /^(rgb|rgba|hsl|hsla|oklch|oklab)\(/i.test(value);
  const group = groupOf(prefix, value, isColor);
  if (group === undefined) return undefined;
  const variants = parts.map((part) => `${part}:`).join('');
  return {
    className,
    group,
    value,
    replacement: (token) => `${variants}${important}${negative}${prefix}-${token}${modifier}`,
  };
}

function groupOf(prefix: string, value: string, isColor: boolean): TokenGroup | undefined {
  if (isColor) return colorPrefixes.has(prefix) ? 'color' : undefined;
  if (prefix === 'text' && lengthValue.test(value)) return 'text';
  if (radiusPrefix.test(prefix)) return 'radius';
  if (spacingPrefix.test(prefix) && lengthValue.test(value)) return 'spacing';
  if (prefix === 'shadow') return 'shadow';
  return undefined;
}

function matchingToken(group: Record<string, string>, raw: RawValue): string | undefined {
  const wanted = normalize(raw.value);
  return Object.entries(group).find(([, value]) => normalize(value) === wanted)?.[0];
}

function normalize(value: string): string {
  return (
    parseHexColor(value) ?? value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/['"]/g, '')
  );
}

function splitVariants(className: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < className.length; index++) {
    const char = className[index];
    if (char === '[' || char === '(') depth++;
    else if (char === ']' || char === ')') depth--;
    else if (char === ':' && depth === 0) {
      parts.push(className.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(className.slice(start));
  return parts;
}
