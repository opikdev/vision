import type { Artboard, VisionDocument } from '@vision/format';
import { describe, expect, it } from 'vitest';
import { styleKey } from './style-key';

function artboard(id: string, cardClass: string, text = 'Hi'): Artboard {
  return {
    id,
    name: id,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    class: 'bg-white',
    children: [
      {
        type: 'frame',
        id: `${id}-card`,
        class: cardClass,
        children: [{ type: 'text', id: `${id}-text`, class: 'text-sm', text }],
      },
    ],
  };
}

function design(artboards: Artboard[], brand = '#000'): VisionDocument {
  return {
    format: 'vision',
    version: 1,
    tokens: { color: { brand } },
    pages: [{ id: 'page', name: 'Page', artboards }],
  };
}

describe('styleKey', () => {
  it('lists the tokens and every class once, sorted', () => {
    expect(styleKey(design([artboard('a', 'flex  p-4'), artboard('b', 'p-4 grid')]))).toBe(
      '[{"color":{"brand":"#000"}},["bg-white","flex","grid","p-4","text-sm"]]',
    );
  });

  it('stays the same when only text changes', () => {
    const before = design([artboard('a', 'flex')]);
    expect(styleKey(design([artboard('a', 'flex', 'Bye')]))).toBe(styleKey(before));
  });

  it('changes when a nested class or a token changes', () => {
    const before = styleKey(design([artboard('a', 'flex')]));
    expect(styleKey(design([artboard('a', 'flex gap-2')]))).not.toBe(before);
    expect(styleKey(design([artboard('a', 'flex')], '#fff'))).not.toBe(before);
  });

  it('reuses the classes of an artboard it has seen and reads new artboards afresh', () => {
    const kept = artboard('a', 'flex');
    styleKey(design([kept]));
    const changed = { ...kept, class: 'bg-black' };
    expect(styleKey(design([kept, changed]))).toBe(
      '[{"color":{"brand":"#000"}},["bg-black","bg-white","flex","text-sm"]]',
    );
  });
});
