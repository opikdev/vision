import type { Artboard, FrameNode, Node, VisionDocument } from '@vision/format';
import { crc32, deflateSync } from 'node:zlib';

export interface StressSize {
  artboards: number;
  nodesPerArtboard: number;
}

export const stressSizes = {
  medium: { artboards: 8, nodesPerArtboard: 300 },
  large: { artboards: 30, nodesPerArtboard: 1000 },
} satisfies Record<string, StressSize>;

export type StressSizeName = keyof typeof stressSizes;

export const stressPageId = 'stress';
export const artboardWidth = 1440;
export const artboardHeight = 2400;
export const artboardGap = 200;
export const imageNames = ['photos/photo-1.png', 'photos/photo-2.png', 'photos/photo-3.png'];

const columns = 6;
const cardsPerSection = 6;
const nodesPerCard = 12;
const nodesPerSection = 3 + cardsPerSection * nodesPerCard;

const words = [
  'linen',
  'harbor',
  'copper',
  'meadow',
  'atlas',
  'ember',
  'quartz',
  'willow',
  'signal',
  'orbit',
  'cedar',
  'pebble',
];
const icon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h16M12 4v16"/></svg>';

export function cardTitleId(artboard: number, section: number, card: number): string {
  return `a${artboard}-s${section}-c${card}-title`;
}

export function badgeLabelId(artboard: number, section: number, card: number): string {
  return `a${artboard}-s${section}-c${card}-badge-label`;
}

export function artboardId(index: number): string {
  return `screen-${index}`;
}

export function stressDesign(size: StressSize, seed = 1): VisionDocument {
  const random = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
  const phrase = (count: number) => Array.from({ length: count }, () => pick(words)).join(' ');

  const card = (prefix: string, a: number, s: number, c: number): FrameNode => {
    const id = (part: string) => `${prefix}-c${c}-${part}`;
    return {
      type: 'frame',
      id: id('card'),
      class:
        `flex flex-col overflow-hidden rounded-card bg-white shadow-card ${pick(['', 'border border-line', 'ring-1 ring-line'])}`.trim(),
      children: [
        {
          type: 'image',
          id: id('image'),
          class: `${pick(['h-40', 'h-44', 'h-48', 'h-[176px]'])} w-full object-cover`,
          src: pick(imageNames),
          alt: phrase(2),
        },
        {
          type: 'frame',
          id: id('body'),
          class: `flex flex-col ${pick(['gap-1', 'gap-2', 'gap-3'])} ${pick(['p-4', 'p-5', 'p-6', 'px-5 py-4'])}`,
          children: [
            {
              type: 'text',
              id: cardTitleId(a, s, c),
              class: `${pick(['text-lg', 'text-xl', 'text-[19px]'])} font-semibold tracking-tight text-fg`,
              text: `${phrase(2)} ${a}.${s}.${c}`,
            },
            {
              type: 'text',
              id: id('description'),
              class: `${pick(['text-sm', 'text-[13px]', 'text-base'])} leading-relaxed ${pick(['text-fg-muted', 'text-slate-600', 'text-zinc-500'])} line-clamp-${pick([2, 3])}`,
              text: phrase(12),
            },
            {
              type: 'frame',
              id: id('meta'),
              class: `mt-${pick([2, 3, 4])} flex items-center gap-2 text-xs text-fg-muted`,
              children: [
                { type: 'svg', id: id('icon'), class: 'size-4 shrink-0 text-brand', svg: icon },
                { type: 'text', id: id('meta-label'), text: `${pick(words)} · ${c + 2} min` },
                {
                  type: 'frame',
                  id: id('badge'),
                  class: `ml-auto flex items-center gap-1 rounded-full ${pick(['bg-surface', 'bg-brand/10', 'bg-emerald-50'])} px-2 py-0.5`,
                  children: [
                    {
                      type: 'frame',
                      id: id('dot-wrap'),
                      class: 'flex items-center',
                      children: [
                        {
                          type: 'frame',
                          id: id('dot'),
                          class: `size-1.5 rounded-full ${pick(['bg-brand', 'bg-emerald-500', 'bg-amber-500'])}`,
                        },
                      ],
                    },
                    {
                      type: 'text',
                      id: badgeLabelId(a, s, c),
                      class: 'font-medium text-fg',
                      text: pick(['New', 'Popular', 'Draft', 'Live']),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  };

  const section = (a: number, s: number): FrameNode => {
    const prefix = `a${a}-s${s}`;
    return {
      type: 'frame',
      id: `${prefix}-section`,
      name: `Section ${s + 1}`,
      class:
        `flex flex-col gap-6 ${pick(['px-12 py-16', 'px-12 py-12', 'px-[56px] py-14'])} ${pick(['bg-surface', 'bg-white', ''])}`.trim(),
      children: [
        {
          type: 'text',
          id: `${prefix}-heading`,
          class: `${pick(['text-2xl', 'text-3xl', 'text-[28px]'])} font-semibold tracking-tight text-fg md:text-${pick(['3xl', '4xl'])}`,
          text: phrase(3),
        },
        {
          type: 'frame',
          id: `${prefix}-grid`,
          class: `grid grid-cols-2 ${pick(['gap-4', 'gap-6', 'gap-8'])} md:grid-cols-3 lg:grid-cols-${pick([3, 6])}`,
          children: Array.from({ length: cardsPerSection }, (_, c) => card(prefix, a, s, c)),
        },
      ],
    };
  };

  const artboard = (a: number): Artboard => {
    const sections = Math.floor((size.nodesPerArtboard - 1) / nodesPerSection);
    const children: Node[] = Array.from({ length: sections }, (_, s) => section(a, s));
    const filler = size.nodesPerArtboard - sections * nodesPerSection - 1;
    children.push({
      type: 'frame',
      id: `a${a}-footer`,
      name: 'Footer',
      class: 'flex flex-wrap gap-x-6 gap-y-2 border-t border-line px-12 py-8 text-sm text-fg-muted',
      children: Array.from({ length: filler }, (_, index) => ({
        type: 'text' as const,
        id: `a${a}-footer-${index}`,
        text: phrase(2),
      })),
    });
    return {
      id: artboardId(a),
      name: `Screen ${a + 1}`,
      x: (a % columns) * (artboardWidth + artboardGap),
      y: Math.floor(a / columns) * (artboardHeight + artboardGap),
      width: artboardWidth,
      height: artboardHeight,
      class: 'bg-white font-sans text-fg antialiased',
      children,
    };
  };

  return {
    format: 'vision',
    version: 1,
    tokens: {
      color: {
        brand: '#1F3D2B',
        fg: '#1C1C1A',
        'fg-muted': '#6B6B66',
        line: '#DDD8CC',
        surface: '#F2EFE8',
      },
      font: { sans: 'Inter, system-ui, sans-serif' },
      radius: { card: '12px' },
      shadow: { card: '0 1px 2px rgb(28 28 26 / 0.04), 0 8px 24px rgb(28 28 26 / 0.06)' },
    },
    pages: [
      {
        id: stressPageId,
        name: 'Stress',
        artboards: Array.from({ length: size.artboards }, (_, a) => artboard(a)),
      },
    ],
  };
}

export function stressImage(index: number): Uint8Array {
  const width = 64;
  const height = 40;
  const shade = [0x8f, 0xb8, 0x6a][index % 3] ?? 0x80;
  const row = Uint8Array.from([
    0,
    ...Array.from({ length: width }, () => [shade, 0x9a, 0x7c]).flat(),
  ]);
  const pixels = new Uint8Array(row.length * height);
  for (let y = 0; y < height; y++) pixels.set(row, y * row.length);
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 2, 0, 0, 0], 8);
  return concat([
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', new Uint8Array()),
  ]);
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typed = concat([new TextEncoder().encode(type), data]);
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, data.length);
  const checksum = new Uint8Array(4);
  new DataView(checksum.buffer).setUint32(0, crc32(typed));
  return concat([length, typed, checksum]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
