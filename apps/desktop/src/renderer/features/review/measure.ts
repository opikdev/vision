import type { Layout, MeasuredBox, Rgba } from '@vision/format';

export type ColorReader = (css: string) => Rgba;

/** Measures an artboard's drawn root and nodes in artboard pixels, keyed by artboard and node id. */
export function measureArtboard(doc: Document, artboardId: string, readColor: ColorReader): Layout {
  const layout: Layout = {};
  const root = doc.querySelector('[data-artboard]');
  if (root !== null) layout[artboardId] = measure(root, readColor);
  for (const element of doc.querySelectorAll('[data-node-id]')) {
    const id = element.getAttribute('data-node-id');
    if (id !== null) layout[id] = measure(element, readColor);
  }
  return layout;
}

/** Converts any CSS color, including oklch and color-mix, to 8-bit sRGB by painting it. */
export function canvasColorReader(): ColorReader {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) throw new Error("Couldn't create a canvas to read colors");
  const cache = new Map<string, Rgba>();
  return (css) => {
    const known = cache.get(css);
    if (known !== undefined) return known;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000';
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
    const color: Rgba = [r, g, b, Math.round((a / 255) * 1000) / 1000];
    cache.set(css, color);
    return color;
  };
}

function measure(element: Element, readColor: ColorReader): MeasuredBox {
  const view = element.ownerDocument.defaultView;
  if (view === null) throw new Error('The artboard has no window to measure in');
  const style = view.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const typed = element.computedStyleMap();
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const;
  return {
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
    visible: element.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    display: style.display,
    position: style.position,
    overflowX: style.overflowX,
    overflowY: style.overflowY,
    textOverflow: style.textOverflow,
    lineClamp: !['', 'none'].includes(style.getPropertyValue('-webkit-line-clamp')),
    transformed: ['transform', 'translate', 'rotate', 'scale'].some(
      (property) => style.getPropertyValue(property) !== 'none',
    ),
    gridArea: `${style.gridRowStart} / ${style.gridColumnStart}`,
    color: readColor(style.color),
    background: readColor(style.backgroundColor),
    backgroundImage: style.backgroundImage !== 'none',
    borderWidth: Math.max(
      ...sides.map((side) =>
        style.getPropertyValue(`border-${side}-style`) === 'none'
          ? 0
          : length(style.getPropertyValue(`border-${side}-width`)),
      ),
    ),
    radius: Math.max(
      ...corners.map((corner) => length(style.getPropertyValue(`border-${corner}-radius`))),
    ),
    fontSize: length(style.fontSize),
    fontWeight: Number(style.fontWeight) || 400,
    lineHeight: style.lineHeight === 'normal' ? null : length(style.lineHeight),
    fontFamily: style.fontFamily.slice(0, 500),
    padding: [
      length(style.paddingTop),
      length(style.paddingRight),
      length(style.paddingBottom),
      length(style.paddingLeft),
    ],
    margin: [
      pixels(typed.get('margin-top')),
      pixels(typed.get('margin-right')),
      pixels(typed.get('margin-bottom')),
      pixels(typed.get('margin-left')),
    ],
    rowGap: style.rowGap === 'normal' ? null : length(style.rowGap),
    columnGap: style.columnGap === 'normal' ? null : length(style.columnGap),
    cursor: style.cursor,
  };
}

function length(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? round(parsed) : 0;
}

// Margins come from the computed (not used) value, so `auto` stays a keyword instead of the space it fills.
function pixels(value: CSSStyleValue | undefined): number | null {
  const unit = value as { value?: unknown; unit?: unknown } | undefined;
  return typeof unit?.value === 'number' && unit.unit === 'px' ? round(unit.value) : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
