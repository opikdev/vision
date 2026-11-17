import { describe, expect, it } from 'vitest';
import { box, findingsOf, frame, text } from './test-layout';

describe('overflow', () => {
  it('reports content that runs past the bottom of the artboard, with the height it needs', () => {
    expect(
      findingsOf('overflow', [frame('footer', [text('legal', '© 2026 Fernhill')])], {
        footer: box({ y: 250, width: 400, height: 100 }),
        legal: box({ y: 330 }),
      }),
    ).toEqual([
      {
        rule: 'overflow',
        severity: 'error',
        artboardId: 'board',
        nodeId: 'board',
        message:
          'Content runs to y=350 but the artboard is 300px tall, so "© 2026 Fernhill" and anything below 300px is cut off.',
        fix: 'Make the artboard 350px tall with update_artboard, or tighten the layout.',
      },
    ]);
  });

  it('ignores content that fits, padding past the bottom, positioned decorations and clipped content', () => {
    expect(
      findingsOf(
        'overflow',
        [
          frame('main', [text('h1', 'Checkout')]),
          frame('blob', [], { class: 'absolute -right-20' }),
          frame('scroller', [frame('rows')]),
        ],
        {
          main: box({ width: 400, height: 320 }),
          h1: box(),
          blob: box({ x: 320, y: 250, width: 200, height: 200, position: 'absolute' }),
          scroller: box({ width: 400, height: 280, overflowY: 'hidden', scrollHeight: 600 }),
          rows: box({ width: 400, height: 600 }),
        },
      ),
    ).toEqual([]);
  });

  it('reports the outermost layer that sticks out of the artboard sideways', () => {
    expect(
      findingsOf('overflow', [frame('table', [text('cell', 'workout_completed')])], {
        table: box({ x: 0, width: 520, height: 100 }),
        cell: box({ x: 400, width: 120 }),
      }).map(({ nodeId, message }) => [nodeId, message]),
    ).toEqual([
      [
        'table',
        '"workout_completed" spans x=0 to x=520, outside the 400px-wide artboard, so part of it is cut off.',
      ],
    ]);
  });

  it('reports text cut off by a parent that hides overflow', () => {
    expect(
      findingsOf('overflow', [frame('card', [text('body', 'Water every 7 days')])], {
        card: box({ width: 200, height: 40, overflowY: 'hidden', scrollHeight: 80 }),
        body: box({ width: 200, height: 80 }),
      }),
    ).toEqual([
      {
        rule: 'overflow',
        severity: 'error',
        artboardId: 'board',
        nodeId: 'card',
        message:
          'Text "Water every 7 days" is cut off: its content needs 80px of height but the box shows 40px.',
        fix: 'Remove the fixed height (use min-h-* or let it grow) or shorten the text.',
      },
    ]);
  });

  it('accepts images cropped by a parent that hides overflow', () => {
    expect(
      findingsOf(
        'overflow',
        [frame('thumb', [{ type: 'image', id: 'photo', src: 'p.jpg', alt: 'Monstera' }])],
        {
          thumb: box({
            width: 80,
            height: 80,
            overflowX: 'hidden',
            overflowY: 'hidden',
            scrollHeight: 120,
          }),
          photo: box({ width: 80, height: 120 }),
        },
      ),
    ).toEqual([]);
  });

  it('warns about truncated text', () => {
    expect(
      findingsOf('overflow', [text('name', 'Organic Honeycrisp apples')], {
        name: box({ width: 120, overflowX: 'hidden', textOverflow: 'ellipsis', scrollWidth: 190 }),
      }).map(({ severity, message }) => [severity, message]),
    ).toEqual([
      ['warning', 'Text "Organic Honeycrisp apples" is truncated: it needs 190px but has 120px.'],
    ]);
  });

  it('warns about text that spills out of its own box', () => {
    expect(
      findingsOf('overflow', [text('url', 'coastline-freight.harbor.chat')], {
        url: box({ width: 120, scrollWidth: 210 }),
      }).map(({ severity, message }) => [severity, message]),
    ).toEqual([
      [
        'warning',
        'Text "coastline-freight.harbor.chat" is 210px wide but its box is 120px, so it spills out.',
      ],
    ]);
  });

  it('accepts glyphs of tightly set headings poking out of their line boxes', () => {
    expect(
      findingsOf('overflow', [text('price', '$10')], {
        price: box({ height: 48, fontSize: 48, lineHeight: 48, scrollHeight: 52 }),
      }),
    ).toEqual([]);
    expect(
      findingsOf('overflow', [text('price', '$10')], {
        price: box({ height: 48, fontSize: 48, lineHeight: 48, scrollHeight: 96 }),
      }).map(({ severity }) => severity),
    ).toEqual(['warning']);
  });

  it('warns about a child that spills out of its parent, unless pulled out on purpose', () => {
    const children = [frame('row', [frame('price'), frame('bleed')])];
    expect(
      findingsOf('overflow', children, {
        row: box({ x: 40, width: 200, height: 40 }),
        price: box({ x: 40, width: 260, height: 40 }),
        bleed: box({ x: 24, width: 232, height: 40, margin: [0, -16, 0, -16] }),
      }).map(({ nodeId, message }) => [nodeId, message]),
    ).toEqual([['price', '"Price" spills 60px out of its parent "Row".']]);
  });
});
