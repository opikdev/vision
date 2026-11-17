import { compareStrings } from './query';
import { tokenGroups, type TokenGroup, type Tokens } from './schema';

const tokenNamePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const lengthPattern =
  /^-?(\d+\.?\d*|\.\d+)(px|rem|em|%|vw|vh|vmin|vmax|svh|dvh|lvh|ch|ex|lh|pt|cm|mm|in)$/;
const cssFunctionPattern = /^[a-z-]+\(.*\)$/is;
const colorPattern = /^(#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|[a-z]+|[a-z-]+\(.*\))$/is;

export function tokenNameProblem(name: string): string | undefined {
  if (tokenNamePattern.test(name)) return undefined;
  return 'Token names use lowercase letters and digits separated by single dashes, such as "fg-muted".';
}

export function tokenValueProblem(group: TokenGroup, value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return 'Give the token a CSS value.';
  if (/[;{}]|\/\*/.test(trimmed)) return 'Token values can\'t contain ";", "{", "}" or "/*".';
  switch (group) {
    case 'color':
      return colorPattern.test(trimmed)
        ? undefined
        : 'Use a CSS color, such as "#1F3D2B", "rgb(31 61 43)" or "oklch(0.4 0.05 150)".';
    case 'text':
    case 'radius':
    case 'spacing':
      return trimmed === '0' || lengthPattern.test(trimmed) || cssFunctionPattern.test(trimmed)
        ? undefined
        : 'Use a CSS length with a unit, such as "12px" or "1.5rem".';
    case 'font':
    case 'shadow':
      return undefined;
  }
}

export function tokenEntries(tokens: Tokens | undefined): [TokenGroup, string, string][] {
  if (tokens === undefined) return [];
  return tokenGroups.flatMap((group) =>
    Object.entries(tokens[group] ?? {})
      .sort(([a], [b]) => compareStrings(a, b))
      .map(([name, value]): [TokenGroup, string, string] => [group, name, value]),
  );
}

export function tokensToThemeCss(tokens?: Tokens): string {
  const lines = tokenEntries(tokens).map(
    ([group, name, value]) => `  --${group}-${name}: ${value};`,
  );
  return `@theme {\n${lines.join('\n')}${lines.length > 0 ? '\n' : ''}}\n`;
}
