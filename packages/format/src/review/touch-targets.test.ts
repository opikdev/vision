import { describe, expect, it } from 'vitest';
import { box, findingsOf, frame, text } from './test-layout';

const phone = { board: { width: 390, height: 844 } };

describe('touch targets', () => {
  it('warns about small buttons and links on phone-sized artboards', () => {
    expect(
      findingsOf(
        'touch-target',
        [frame('button-1', [text('label', 'Change')]), text('a-1', 'Sign in')],
        { 'button-1': box({ width: 72, height: 32 }), label: box(), 'a-1': box({ width: 52 }) },
        phone,
      ),
    ).toEqual([
      {
        rule: 'touch-target',
        severity: 'warning',
        artboardId: 'board',
        nodeId: 'button-1',
        message:
          '"Change" looks tappable but is 72px × 32px; touch targets need at least 44 × 44px.',
        fix: 'Make it at least 44px in both directions, such as min-h-11 min-w-11 or more padding.',
      },
      {
        rule: 'touch-target',
        severity: 'warning',
        artboardId: 'board',
        nodeId: 'a-1',
        message:
          '"Sign in" looks tappable but is 52px × 20px; touch targets need at least 44 × 44px.',
        fix: 'Make it at least 44px in both directions, such as min-h-11 min-w-11 or more padding.',
      },
    ]);
  });

  it('recognises tappable layers by name, cursor and a short filled label', () => {
    expect(
      findingsOf(
        'touch-target',
        [
          frame('back', [], { name: 'Back button' }),
          frame('row', [], { class: 'cursor-pointer' }),
          frame('pill', [text('pill-label', 'Continue')]),
        ],
        {
          back: box({ width: 24, height: 24 }),
          row: box({ width: 300, height: 36, cursor: 'pointer' }),
          pill: box({ width: 300, height: 40, background: [31, 61, 43, 1] }),
          'pill-label': box(),
        },
        phone,
      ).map(({ nodeId }) => nodeId),
    ).toEqual(['back', 'row', 'pill']);
  });

  it('looks inside a filled container that only looks like a button', () => {
    expect(
      findingsOf(
        'touch-target',
        [frame('stepper', [frame('button-1'), text('count', '1'), frame('button-2')])],
        {
          stepper: box({ width: 100, height: 44, borderWidth: 1 }),
          'button-1': box({ width: 36, height: 36 }),
          count: box({ width: 24 }),
          'button-2': box({ width: 36, height: 36 }),
        },
        phone,
      ).map(({ nodeId }) => nodeId),
    ).toEqual(['button-1', 'button-2']);
  });

  it('accepts big enough targets, badges, inner parts and desktop artboards', () => {
    const children = [
      frame('button-1', [text('a-1', 'Place order')]),
      frame('badge', [text('badge-label', 'New')]),
      frame('button-2', [text('a-2', 'Edit')]),
    ];
    const layout = {
      'button-1': box({ width: 358, height: 52 }),
      'a-1': box({ width: 100, height: 20 }),
      badge: box({ width: 40, height: 22, background: [220, 252, 231, 1] }),
      'badge-label': box(),
      'button-2': box({ width: 40, height: 32 }),
      'a-2': box({ width: 30, height: 20 }),
    };
    expect(findingsOf('touch-target', children, layout, phone).map(({ nodeId }) => nodeId)).toEqual(
      ['button-2'],
    );
    expect(
      findingsOf('touch-target', children, layout, { board: { width: 1440, height: 900 } }),
    ).toEqual([]);
  });
});
