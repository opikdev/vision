import { describe, expect, it } from 'vitest';
import { box, findingsOf, frame, text } from './test-layout';

describe('spacing', () => {
  it('reports spacing off the 4px grid once per artboard, worst first', () => {
    expect(
      findingsOf('spacing', [frame('pay-button', [text('label', 'Pay')]), frame('tags')], {
        'pay-button': box({ padding: [10, 16, 10, 16] }),
        label: box({ margin: [0, 0, 13, 0] }),
        tags: box({ display: 'flex', rowGap: 6, columnGap: 6 }),
      }),
    ).toEqual([
      {
        rule: 'spacing',
        severity: 'warning',
        artboardId: 'board',
        nodeId: 'tags',
        message:
          '5 spacing values are off the 4px grid (6px, 10px, 13px), such as row-gap 6px on "Tags"; padding-top 10px on "Pay"; margin-bottom 13px on "Pay".',
        fix: 'Use multiples of 4px for padding, margin and gap (p-1 = 4px, p-2 = 8px, p-3 = 12px…), e.g. 6px → 4px or 8px.',
      },
    ]);
  });

  it('accepts the grid, hairlines, auto margins and gaps outside flex and grid', () => {
    expect(
      findingsOf('spacing', [frame('card', [text('label', 'Pay')])], {
        card: box({ padding: [24, 16, 24, 16], margin: [8, null, 0, null], rowGap: 6 }),
        label: box({ padding: [2, 1, 2, 1] }),
      }),
    ).toEqual([]);
  });
});
