import { describe, expect, it } from 'vitest';
import type { VisionDocument } from '../schema';
import { artboard } from '../test-fixtures';
import { reviewDesign, score } from './review';
import type { Finding } from './schema';
import { box, frame, text } from './test-layout';

const document: VisionDocument = {
  format: 'vision',
  version: 1,
  tokens: { color: { brand: '#1F3D2B' } },
  pages: [
    {
      id: 'page-1',
      name: 'Checkout',
      artboards: [
        artboard('cart', {
          children: [text('t1', 'Lorem ipsum'), frame('f1', [text('t2', 'Pay')])],
        }),
        artboard('done', { x: 500, children: [text('t3', 'Title')] }),
      ],
    },
  ],
};

const found = (severity: Finding['severity']): Finding => ({
  rule: 'content',
  severity,
  artboardId: 'cart',
  nodeId: 't1',
  message: 'm',
});

describe('reviewDesign', () => {
  it('runs only the checks that need no layout when none is given', () => {
    expect(reviewDesign(document)).toEqual({
      score: 70,
      nodes: 4,
      counts: { error: 1, warning: 1, info: 0 },
      artboards: [
        {
          id: 'cart',
          name: 'cart',
          pageId: 'page-1',
          width: 400,
          height: 300,
          nodes: 3,
          score: 75,
          counts: { error: 1, warning: 0, info: 0 },
        },
        {
          id: 'done',
          name: 'done',
          pageId: 'page-1',
          width: 400,
          height: 300,
          nodes: 1,
          score: 95,
          counts: { error: 0, warning: 1, info: 0 },
        },
      ],
      findings: [
        {
          rule: 'content',
          severity: 'error',
          artboardId: 'cart',
          nodeId: 't1',
          message: 'Text "Lorem ipsum" is lorem ipsum.',
          fix: 'Write the real copy this screen would show.',
        },
        {
          rule: 'content',
          severity: 'warning',
          artboardId: 'done',
          nodeId: 't3',
          message: 'Text "Title" is placeholder copy.',
          fix: 'Replace it with specific, real content.',
        },
      ],
    });
  });

  it('adds the layout checks when the layout is given', () => {
    const report = reviewDesign(document, {
      cart: box({ width: 400, height: 300, background: [255, 255, 255, 1] }),
      t1: box(),
      f1: box({ y: 30 }),
      t2: box({ y: 30, color: [200, 200, 200, 1] }),
    });
    expect(report.findings.map(({ rule, nodeId }) => [rule, nodeId])).toEqual([
      ['contrast', 't2'],
      ['content', 't1'],
      ['content', 't3'],
    ]);
  });

  it('reviews one artboard when asked, and rejects an unknown one', () => {
    expect(reviewDesign(document, undefined, 'done').artboards.map(({ id }) => id)).toEqual([
      'done',
    ]);
    expect(() => reviewDesign(document, undefined, 'missing')).toThrow(
      'No artboard with id "missing"',
    );
  });
});

describe('score', () => {
  it('takes 5 points per error and 1 per warning per 100 nodes, counting at least 20 nodes', () => {
    expect(score([], 0)).toBe(100);
    expect(score([found('error'), found('warning'), found('info')], 200)).toBe(97);
    expect(score([found('error'), found('warning'), found('warning')], 10)).toBe(65);
    expect(
      score(
        Array.from({ length: 30 }, () => found('error')),
        100,
      ),
    ).toBe(0);
  });
});
