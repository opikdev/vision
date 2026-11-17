import { describe, expect, it } from 'vitest';
import { box, findingsOf, text } from './test-layout';

const sizes = (values: number[]) => ({
  children: values.map((_, index) => text(`t${index}`, `Text ${index}`)),
  layout: Object.fromEntries(values.map((fontSize, index) => [`t${index}`, box({ fontSize })])),
});

describe('type scale', () => {
  it('warns about more than 6 font sizes', () => {
    const { children, layout } = sizes([12, 13, 14, 16, 18, 24, 40]);
    expect(findingsOf('type-scale', children, layout)).toEqual([
      {
        rule: 'type-scale',
        severity: 'warning',
        artboardId: 'board',
        nodeId: 'board',
        message:
          '7 font sizes (12px, 13px, 14px, 16px, 18px, 24px, 40px); a clear hierarchy needs 6 or fewer.',
        fix: 'Pick a small type scale, such as 12/14/16/20/28/40px, set it as text tokens and use only those.',
      },
    ]);
    const six = sizes([12, 14, 16, 20, 28, 40]);
    expect(findingsOf('type-scale', six.children, six.layout)).toEqual([]);
  });

  it('warns once about text smaller than 12px', () => {
    expect(
      findingsOf('type-scale', [text('axis', 'Mon'), text('legend', 'Previous period')], {
        axis: box({ fontSize: 10, lineHeight: 14 }),
        legend: box({ fontSize: 11, lineHeight: 16 }),
      }).map(({ nodeId, message }) => [nodeId, message]),
    ).toEqual([['axis', '2 texts are smaller than 12px, such as "Mon" at 10px.']]);
    expect(
      findingsOf('type-scale', [text('axis', 'Mon')], {
        axis: box({ fontSize: 11, lineHeight: 14 }),
      }).map(({ message }) => message),
    ).toEqual(['Text "Mon" is 11px, smaller than 12px.']);
  });

  it('warns about tight or loose line height on wrapped text only', () => {
    const paragraph = 'Reminders tuned to each plant, so nothing dries out.';
    expect(
      findingsOf('type-scale', [text('p', paragraph)], {
        p: box({ fontSize: 16, lineHeight: 16, height: 48 }),
      }).map(({ message }) => message),
    ).toEqual([
      'Text "Reminders tuned to each plant, so nothin…" wraps with a line height of 1.00 × its 16px size; keep it between 1.15 and 2.',
    ]);
    expect(
      findingsOf('type-scale', [text('p', paragraph)], {
        p: box({ fontSize: 16, lineHeight: 40, height: 120 }),
      }).map(({ severity }) => severity),
    ).toEqual(['warning']);
    expect(
      findingsOf('type-scale', [text('h1', 'Grow anything'), text('h2', 'Big and tight')], {
        h1: box({ fontSize: 16, lineHeight: 16, height: 16 }),
        h2: box({ fontSize: 48, lineHeight: 48, height: 96 }),
      }),
    ).toEqual([]);
  });

  it('warns about more than 2 font families', () => {
    const families = ['"Fraunces", serif', 'Inter, sans-serif', 'JetBrains Mono, monospace'];
    expect(
      findingsOf(
        'type-scale',
        families.map((_, index) => text(`t${index}`, 'Sprout')),
        Object.fromEntries(families.map((fontFamily, index) => [`t${index}`, box({ fontFamily })])),
      ).map(({ message }) => message),
    ).toEqual(['3 font families (Fraunces, Inter, JetBrains Mono); use 2 at most.']);
    expect(
      findingsOf('type-scale', [text('a', 'Sprout'), text('b', 'Sprout')], {
        a: box({ fontFamily: 'Fraunces, serif' }),
        b: box({ fontFamily: 'Inter, sans-serif' }),
      }),
    ).toEqual([]);
  });
});

describe('radii', () => {
  it('warns about more than 4 corner radii, ignoring pills and circles', () => {
    const radii = [4, 6, 8, 12, 16];
    const children = radii.map((_, index) => text(`r${index}`, 'Card'));
    const layout = Object.fromEntries(
      radii.map((radius, index) => [`r${index}`, box({ radius, height: 80 })]),
    );
    expect(findingsOf('radii', children, layout)).toEqual([
      {
        rule: 'radii',
        severity: 'warning',
        artboardId: 'board',
        nodeId: 'board',
        message: '5 corner radii (4px, 6px, 8px, 12px, 16px); use 4 or fewer.',
        fix: 'Pick 2–3 radii (such as 6px for controls, 12px for cards), set them as radius tokens and use rounded-full for pills.',
      },
    ]);
    expect(
      findingsOf('radii', children, {
        ...layout,
        r4: box({ radius: 33554400, height: 32 }),
      }),
    ).toEqual([]);
  });
});
