import { HtmlError, type ResolvedIcon } from '@vision/format';
import { loadIconSet } from './hugeicons';
import { iconName, rootAttributes, type IconShape } from './icon-set';

const suggestionCount = 3;

export function resolveIcon(requested: string): ResolvedIcon {
  const name = canonicalName(requested);
  const shapes = name === undefined ? undefined : loadIconSet().icons[name];
  if (name === undefined || shapes === undefined) {
    const suggestions = findIcons(requested, suggestionCount);
    const hint =
      suggestions.length === 0
        ? 'Call find_icons to search the icon names.'
        : `Did you mean ${suggestions.map((suggestion) => `"${suggestion}"`).join(', ')}? Call find_icons to search for more.`;
    throw new HtmlError(`Unknown icon "${requested}". ${hint}`);
  }
  return { name, label: iconLabel(name), svg: iconSvg(name, shapes) };
}

export function findIcons(query: string, limit: number): string[] {
  const words = searchWords(query);
  if (words.length === 0) return [];
  const { icons, aliases } = loadIconSet();
  const best = new Map<string, number>();
  const consider = (searchable: string, icon: string): void => {
    const score = matchScore(words, searchable.split('-'));
    if (score > (best.get(icon) ?? 0)) best.set(icon, score);
  };
  for (const icon of Object.keys(icons)) consider(icon, icon);
  for (const [alias, icon] of Object.entries(aliases)) consider(alias, icon);
  return [...best]
    .sort(
      ([a, scoreA], [b, scoreB]) => scoreB - scoreA || a.length - b.length || a.localeCompare(b),
    )
    .slice(0, limit)
    .map(([icon]) => icon);
}

function canonicalName(requested: string): string | undefined {
  const trimmed = requested.trim();
  const name = /[A-Z]/.test(trimmed) ? iconName(trimmed) : trimmed.toLowerCase();
  const { icons, aliases } = loadIconSet();
  return name in icons ? name : aliases[name];
}

function iconLabel(name: string): string {
  const words = name.replace(/(-\d+)+$/, '').replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function iconSvg(name: string, shapes: IconShape[]): string {
  const root = { viewBox: '0 0 24 24', width: '24', height: '24', ...rootAttributes };
  const children = shapes.map(([tag, attributes]) => `<${tag}${attributeText(attributes)}/>`);
  return `<svg${attributeText({ ...root, 'data-icon': name })}>${children.join('')}</svg>`;
}

function attributeText(attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`)
    .join('');
}

function searchWords(query: string): string[] {
  return query
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '');
}

function matchScore(words: string[], nameWords: string[]): number {
  let score = 0;
  let matched = 0;
  for (const word of words) {
    if (/^\d+$/.test(word)) {
      score += nameWords.includes(word) ? 0.5 : 0;
      continue;
    }
    const found = Math.max(0, ...nameWords.map((nameWord) => wordScore(word, nameWord)));
    if (found > 0) matched++;
    score += found > 0 ? found : -1;
  }
  return matched === 0 ? 0 : score - 0.1 * Math.max(0, nameWords.length - matched);
}

function wordScore(word: string, nameWord: string): number {
  if (nameWord === word) return 3;
  if (nameWord.startsWith(word) || (nameWord.length >= 3 && word.startsWith(nameWord))) return 2;
  if (word.length >= 4 && nameWord.includes(word)) return 1.5;
  if (word.length >= 4 && withinOneEdit(word, nameWord)) return 1;
  return 0;
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
