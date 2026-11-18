export type IconShape = [tag: string, attributes: Record<string, string>];

export interface IconSet {
  icons: Record<string, IconShape[]>;
  aliases: Record<string, string>;
}

export const rootAttributes: Readonly<Record<string, string>> = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '1.5',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

const svgInitialStrokes: Record<string, string> = {
  stroke: 'none',
  'stroke-width': '1',
  'stroke-linecap': 'butt',
  'stroke-linejoin': 'miter',
};

const shapeSchema = (value: unknown): value is [string, Record<string, unknown>][] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      Array.isArray(entry) &&
      typeof entry[0] === 'string' &&
      typeof entry[1] === 'object' &&
      entry[1] !== null,
  );

// Hugeicons exports each icon several times: `Home01Icon`, `HomeIcon`, `Home01FreeIcons` and
// Lucide-style aliases such as `House`. The longest `…Icon` export is the icon's own name.
export function buildIconSet(exports: Record<string, unknown>): IconSet {
  const groups = new Map<unknown, string[]>();
  for (const [name, value] of Object.entries(exports)) {
    if (!shapeSchema(value) || name.endsWith('FreeIcons')) continue;
    groups.set(value, [...(groups.get(value) ?? []), name]);
  }
  const icons: Record<string, IconShape[]> = {};
  const candidates: [alias: string, icon: string][] = [];
  for (const [value, names] of groups) {
    const own = names
      .filter((name) => name.endsWith('Icon'))
      .sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
    if (own === undefined || !shapeSchema(value)) continue;
    const icon = iconName(own);
    icons[icon] = value.map(([tag, attributes]) => [tag, shapeAttributes(attributes)]);
    for (const name of names) {
      const alias = iconName(name);
      if (alias !== icon) candidates.push([alias, icon]);
    }
  }
  const aliases: Record<string, string> = {};
  for (const [alias, icon] of candidates) {
    if (!(alias in icons) && !(alias in aliases)) aliases[alias] = icon;
  }
  return { icons, aliases };
}

export function iconName(exportName: string): string {
  return exportName
    .replace(/Icon$/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([A-Za-z])(\d)/g, '$1-$2')
    .replace(/(\d)([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function shapeAttributes(source: Record<string, unknown>): Record<string, string> {
  const attributes = new Map(
    Object.entries(source)
      .filter(([key]) => key !== 'key')
      .map(([key, value]): [string, string] => [
        key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
        String(value),
      ]),
  );
  if (!attributes.has('stroke')) {
    for (const name of Object.keys(svgInitialStrokes)) attributes.delete(name);
    attributes.set('stroke', 'none');
    return Object.fromEntries(attributes);
  }
  for (const [name, initial] of Object.entries(svgInitialStrokes)) {
    const value = attributes.get(name) ?? initial;
    if (value === rootAttributes[name]) attributes.delete(name);
    else attributes.set(name, value);
  }
  return Object.fromEntries(attributes);
}
