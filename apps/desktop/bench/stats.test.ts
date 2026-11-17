import { describe, expect, it } from 'vitest';
import { formatReport, percentile, summarize } from './stats';

describe('percentile', () => {
  it('picks the nearest rank', () => {
    expect(percentile([5, 1, 4, 2, 3], 0.5)).toBe(3);
    expect(percentile([5, 1, 4, 2, 3], 0.95)).toBe(5);
    expect(percentile([10, 20], 0.5)).toBe(10);
    expect(percentile([], 0.5)).toBeNaN();
  });
});

describe('formatReport', () => {
  it('puts each size in its own median and p95 columns', () => {
    const report = formatReport(
      { medium: summarize({ 'open (ms)': [120.4, 80, 100] }), large: summarize({}) },
      'M1',
    );
    expect(report).toBe(
      [
        'Vision bench on M1',
        '',
        '| Metric | medium median | medium p95 | large median | large p95 |',
        '| --- | ---: | ---: | ---: | ---: |',
        '| open (ms) | 100 | 120 |  |  |',
        '',
      ].join('\n'),
    );
  });
});
