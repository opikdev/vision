import type { Rgba } from './schema';

export const white: Rgba = [255, 255, 255, 1];

export function over(top: Rgba, bottom: Rgba): Rgba {
  const [r, g, b, a] = top;
  const [br, bg, bb, ba] = bottom;
  const alpha = a + ba * (1 - a);
  if (alpha === 0) return [0, 0, 0, 0];
  const mix = (front: number, back: number) => (front * a + back * ba * (1 - a)) / alpha;
  return [mix(r, br), mix(g, bg), mix(b, bb), alpha];
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

function luminance([r, g, b]: Rgba): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function toHex([r, g, b]: Rgba): string {
  return `#${[r, g, b]
    .map((value) => Math.round(value).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/** The text color closest to `fg`, darker or lighter, that reaches `target` contrast on `bg`. */
export function readableColor(fg: Rgba, bg: Rgba, target: number): Rgba | undefined {
  const towards: Rgba[] =
    contrastRatio(bg, [0, 0, 0, 1]) >= contrastRatio(bg, white)
      ? [[0, 0, 0, 1], white]
      : [white, [0, 0, 0, 1]];
  for (const end of towards) {
    for (let step = 1; step <= 100; step++) {
      const t = step / 100;
      const candidate: Rgba = [
        Math.round(fg[0] + (end[0] - fg[0]) * t),
        Math.round(fg[1] + (end[1] - fg[1]) * t),
        Math.round(fg[2] + (end[2] - fg[2]) * t),
        1,
      ];
      if (contrastRatio(candidate, bg) >= target) return candidate;
    }
  }
  return undefined;
}

export function parseHexColor(value: string): string | undefined {
  const match = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(value.trim());
  const digits = match?.[1];
  if (digits === undefined) return undefined;
  const full = digits.length <= 4 ? digits.replace(/./g, '$&$&') : digits;
  return `#${full.toUpperCase().replace(/^(.{6})FF$/, '$1')}`;
}
