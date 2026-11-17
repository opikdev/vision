import { describe, expect, it } from 'vitest';
import { box, findingsOf, frame, text } from './test-layout';

describe('overlap', () => {
  it('reports in-flow siblings that overlap, as an error when text is involved', () => {
    expect(
      findingsOf('overlap', [frame('row', [text('label', 'Subtotal'), text('value', '$21.46')])], {
        row: box({ width: 200, height: 20, display: 'flex' }),
        label: box({ x: 0, width: 120 }),
        value: box({ x: 70, width: 80 }),
      }),
    ).toEqual([
      {
        rule: 'overlap',
        severity: 'error',
        artboardId: 'board',
        nodeId: 'value',
        message: '"$21.46" overlaps its sibling "Subtotal" by 50px × 20px.',
        fix: 'Give them room: remove fixed widths or heights, let the row wrap, or use gap instead of offsets. If the overlap is meant, position one of them with absolute.',
      },
    ]);
  });

  it('warns when only shapes overlap', () => {
    expect(
      findingsOf('overlap', [frame('bar'), frame('dot')], {
        bar: box({ y: 0, width: 200, height: 40 }),
        dot: box({ y: 30, width: 40, height: 40 }),
      }).map(({ severity }) => severity),
    ).toEqual(['warning']);
  });

  it('ignores positioned, pulled, transformed, touching and grid-stacked siblings', () => {
    const pair = [text('a', 'Monstera'), text('b', 'Pothos')];
    const first = box({ width: 100, height: 40 });
    expect(
      findingsOf('overlap', pair, {
        a: first,
        b: box({ x: 50, height: 40, position: 'absolute' }),
      }),
    ).toEqual([]);
    expect(
      findingsOf('overlap', pair, {
        a: first,
        b: box({ x: 90, height: 40, margin: [0, 0, 0, -10] }),
      }),
    ).toEqual([]);
    expect(
      findingsOf('overlap', pair, { a: first, b: box({ x: 50, height: 40, transformed: true }) }),
    ).toEqual([]);
    expect(findingsOf('overlap', pair, { a: first, b: box({ x: 98, height: 40 }) })).toEqual([]);
    expect(
      findingsOf('overlap', [frame('stack', pair)], {
        stack: box({ width: 100, height: 40, display: 'grid' }),
        a: box({ width: 100, height: 40, gridArea: '1 / 1' }),
        b: box({ width: 100, height: 40, gridArea: '1 / 1' }),
      }),
    ).toEqual([]);
  });
});
