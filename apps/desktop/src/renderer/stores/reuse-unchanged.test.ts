import type { VisionDocument } from '@vision/format';
import { describe, expect, it } from 'vitest';
import { reuseUnchanged } from './reuse-unchanged';

function design(title: string, color = '#000'): VisionDocument {
  return {
    format: 'vision',
    version: 1,
    tokens: { color: { brand: color } },
    pages: [
      {
        id: 'page',
        name: 'Page',
        artboards: [
          {
            id: 'home',
            name: 'Home',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            children: [
              {
                type: 'frame',
                id: 'card',
                children: [
                  { type: 'text', id: 'title', text: title },
                  { type: 'text', id: 'body', text: 'Body' },
                ],
              },
              { type: 'image', id: 'photo', src: 'a.png' },
            ],
          },
          { id: 'about', name: 'About', x: 200, y: 0, width: 100, height: 100, children: [] },
        ],
      },
    ],
  };
}

describe('reuseUnchanged', () => {
  it('returns the previous document when nothing changed', () => {
    const before = design('Hello');
    expect(reuseUnchanged(before, design('Hello'))).toBe(before);
  });

  it('keeps unchanged artboards and nodes and replaces the path to a change', () => {
    const before = design('Hello');
    const after = reuseUnchanged(before, design('Bye'));
    const [home, about] = after?.pages[0]?.artboards ?? [];
    const [beforeHome, beforeAbout] = before.pages[0]?.artboards ?? [];
    expect(about).toBe(beforeAbout);
    expect(home).not.toBe(beforeHome);
    expect(home?.children[1]).toBe(beforeHome?.children[1]);
    const card = home?.children[0];
    const beforeCard = beforeHome?.children[0];
    expect(card).not.toBe(beforeCard);
    expect(card?.type === 'frame' && card.children?.[1]).toBe(
      beforeCard?.type === 'frame' && beforeCard.children?.[1],
    );
    expect(card?.type === 'frame' && card.children?.[0]).toEqual({
      type: 'text',
      id: 'title',
      text: 'Bye',
    });
  });

  it('replaces a parent whose children were reordered', () => {
    const before = design('Hello');
    const next = design('Hello');
    next.pages[0]?.artboards[0]?.children.reverse();
    const home = reuseUnchanged(before, next)?.pages[0]?.artboards[0];
    expect(home).not.toBe(before.pages[0]?.artboards[0]);
    expect(home?.children.map((node) => node.id)).toEqual(['photo', 'card']);
    expect(home?.children[0]).toBe(before.pages[0]?.artboards[0]?.children[1]);
  });

  it('keeps equal tokens and takes changed ones', () => {
    const before = design('Hello');
    expect(reuseUnchanged(before, design('Bye'))?.tokens).toBe(before.tokens);
    expect(reuseUnchanged(before, design('Hello', '#fff'))?.tokens).toEqual({
      color: { brand: '#fff' },
    });
  });

  it('takes the next document when there is no previous one', () => {
    const next = design('Hello');
    expect(reuseUnchanged(null, next)).toBe(next);
    expect(reuseUnchanged(next, null)).toBeNull();
  });
});
