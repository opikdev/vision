import { outline, parseDocument, serializeDocument } from '@vision/format';
import { describe, expect, it } from 'vitest';
import { stressDesign, stressImage, stressSizes } from './stress-design';

function nodeCount(text: string): number {
  return (text.match(/"type": "(frame|text|image|svg)"/g) ?? []).length;
}

describe('stressDesign', () => {
  it('builds a valid design with the requested artboards and nodes', () => {
    const text = serializeDocument(stressDesign(stressSizes.medium));
    const result = parseDocument(text);
    expect(result.ok && result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ok && result.document.pages[0]?.artboards.length).toBe(8);
    expect(nodeCount(text)).toBe(2400);
  });

  it('is the same for the same seed and differs for another', () => {
    const a = serializeDocument(stressDesign(stressSizes.medium, 7));
    expect(serializeDocument(stressDesign(stressSizes.medium, 7))).toBe(a);
    expect(serializeDocument(stressDesign(stressSizes.medium, 8))).not.toBe(a);
  });

  it('nests nodes eight levels below the artboard', () => {
    const lines = outline(stressDesign({ artboards: 1, nodesPerArtboard: 300 }));
    const depths = lines.split('\n').map((line) => line.length - line.trimStart().length);
    expect(Math.max(...depths) / 2 - 1).toBe(8);
  });

  it('writes a PNG', () => {
    expect(Array.from(stressImage(0).subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
