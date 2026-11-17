import { describe, expect, it } from 'vitest';
import { box, findingsOf, frame, text } from './test-layout';

describe('contrast', () => {
  it('flags body text below 4.5:1 with the measured colors and a passing color', () => {
    expect(
      findingsOf('contrast', [text('note', 'Ships in 2 days')], {
        note: box({ color: [153, 153, 153, 1] }),
      }),
    ).toEqual([
      {
        rule: 'contrast',
        severity: 'error',
        artboardId: 'board',
        nodeId: 'note',
        message:
          'Text "Ships in 2 days" has contrast 2.85:1 (#999999 on #FFFFFF); WCAG AA needs 4.5:1 for body text.',
        fix: 'Use a text color of #767676 or darker, or a darker or lighter background.',
      },
    ]);
  });

  it('passes white text on a dark brand color', () => {
    expect(
      findingsOf('contrast', [frame('cta', [text('label', 'Pay $22.07')])], {
        cta: box({ background: [31, 61, 43, 1] }),
        label: box({ color: [255, 255, 255, 1] }),
      }),
    ).toEqual([]);
  });

  it('accepts 3:1 for large text only', () => {
    const gray = { color: [136, 136, 136, 1] as [number, number, number, number] };
    expect(
      findingsOf('contrast', [text('title', 'Plans')], { title: box({ ...gray, fontSize: 24 }) }),
    ).toEqual([]);
    expect(
      findingsOf('contrast', [text('title', 'Plans')], {
        title: box({ ...gray, fontSize: 19, fontWeight: 700 }),
      }),
    ).toEqual([]);
    expect(
      findingsOf('contrast', [text('title', 'Plans')], {
        title: box({ ...gray, fontSize: 19, fontWeight: 600 }),
      }).map(({ severity }) => severity),
    ).toEqual(['error']);
  });

  it('blends translucent backgrounds over what is behind them', () => {
    const [found] = findingsOf('contrast', [frame('chip', [text('label', 'Draft')])], {
      chip: box({ background: [0, 0, 0, 0.2] }),
      label: box({ color: [255, 255, 255, 1] }),
    });
    expect(found?.message).toBe(
      'Text "Draft" has contrast 1.61:1 (#FFFFFF on #CCCCCC); WCAG AA needs 4.5:1 for body text.',
    );
  });

  it('reports text over a gradient or an image as unmeasured, once per backdrop', () => {
    expect(
      findingsOf(
        'contrast',
        [frame('hero', [text('h1', 'Grow anything'), text('sub', 'Plant care')])],
        {
          hero: box({ width: 400, height: 200, backgroundImage: true }),
          h1: box({ color: [255, 255, 255, 1] }),
          sub: box({ y: 30, color: [255, 255, 255, 1] }),
        },
      ),
    ).toEqual([
      {
        rule: 'contrast',
        severity: 'info',
        artboardId: 'board',
        nodeId: 'hero',
        message: "2 texts sit over an image or gradient, so their contrast can't be measured.",
        fix: 'Check them in a screenshot; add a solid or semi-opaque backdrop behind the text if they are hard to read.',
      },
    ]);
    expect(
      findingsOf(
        'contrast',
        [
          frame('hero', [
            { type: 'image', id: 'photo', src: 'hero.jpg', alt: 'Kitchen' },
            text('h1', 'Grow anything'),
          ]),
        ],
        {
          hero: box({ width: 400, height: 200 }),
          photo: box({ width: 400, height: 200, position: 'absolute' }),
          h1: box({ y: 40, color: [255, 255, 255, 1] }),
        },
      ).map(({ severity, nodeId, message }) => [severity, nodeId, message]),
    ).toEqual([
      [
        'info',
        'photo',
        'Text "Grow anything" sits over an image or gradient, so its contrast can\'t be measured.',
      ],
    ]);
  });

  it('ignores images outside the nearest opaque backdrop', () => {
    expect(
      findingsOf(
        'contrast',
        [
          { type: 'image', id: 'photo', src: 'hero.jpg', alt: 'Kitchen' },
          frame('card', [text('h1', 'Grow anything')]),
        ],
        {
          photo: box({ width: 400, height: 300, position: 'absolute' }),
          card: box({ width: 200, height: 100, background: [255, 255, 255, 1] }),
          h1: box({ color: [28, 28, 26, 1] }),
        },
      ),
    ).toEqual([]);
  });

  it('skips text marked disabled', () => {
    expect(
      findingsOf('contrast', [frame('save-disabled', [text('label', 'Save')])], {
        'save-disabled': box(),
        label: box({ color: [180, 180, 180, 1] }),
      }),
    ).toEqual([]);
  });
});
