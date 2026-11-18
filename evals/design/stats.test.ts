import { describe, expect, it } from 'vitest';
import { verdictMean } from './judge.ts';
import { countElements, formatSpread, spread, transcriptUsage, writeHtmlStats } from './stats.ts';

const writeHtml = (html: string, name = 'mcp__vision__write_html') =>
  JSON.stringify({
    type: 'assistant',
    message: {
      content: [{ type: 'tool_use', name, input: { file: '/d.vis', parent: 'a', html } }],
    },
  });

describe('countElements', () => {
  it('counts elements, with each inline svg as one', () => {
    expect(
      countElements(
        '<div class="p-4"><svg viewBox="0 0 24 24"><path d="M0 0"/><circle r="2"/></svg><p>Hi</p><i data-icon="home"></i></div>',
      ),
    ).toBe(4);
  });

  it('counts nothing in plain text', () => {
    expect(countElements('Total < 5 items')).toBe(0);
  });
});

describe('writeHtmlStats', () => {
  it('sums calls, elements and characters of write_html only', () => {
    const svg = '<svg><path d="M0 0"/></svg>';
    const lines = [
      writeHtml(`<div>${svg}</div>`),
      writeHtml('<p>One</p><p>Two</p>'),
      writeHtml('<p>Ignored</p>', 'mcp__vision__update_node'),
      '{"type":"user","message":{"content":[]}}',
      'not json',
    ];
    expect(writeHtmlStats(lines)).toEqual({
      calls: 2,
      elements: 4,
      htmlChars: 58,
      svgChars: 27,
    });
  });

  it('is zero without write_html calls', () => {
    expect(writeHtmlStats([])).toEqual({ calls: 0, elements: 0, htmlChars: 0, svgChars: 0 });
  });
});

describe('transcriptUsage', () => {
  it('reads the usage of the last result', () => {
    const result = (output: number) =>
      JSON.stringify({
        type: 'result',
        usage: {
          input_tokens: 22,
          cache_creation_input_tokens: 31566,
          cache_read_input_tokens: 208347,
          output_tokens: output,
        },
      });
    expect(transcriptUsage([result(1), 'oops', result(8828)])).toEqual({
      inputTokens: 22,
      cacheCreationTokens: 31566,
      cacheReadTokens: 208347,
      outputTokens: 8828,
    });
  });

  it('is undefined without a result', () => {
    expect(transcriptUsage(['{"type":"assistant"}'])).toBeUndefined();
  });
});

describe('spread', () => {
  it('gives the mean and the sample standard deviation', () => {
    expect(spread([56, 100])).toEqual({ mean: 78, sd: 31.11269837220809 });
  });

  it('has no deviation for one value and nothing for none', () => {
    expect(spread([7])).toEqual({ mean: 7, sd: 0 });
    expect(spread([])).toBeUndefined();
  });

  it('formats with digits and a unit', () => {
    expect(formatSpread({ mean: 0.1234, sd: 0.05 }, 2, '$')).toBe('$0.12 ±0.05');
    expect(formatSpread(undefined)).toBe('–');
  });
});

describe('verdictMean', () => {
  it('averages the six criteria', () => {
    const verdict = (score: number) => ({ score, reason: '' });
    expect(
      verdictMean({
        hierarchy: verdict(8),
        typography: verdict(7),
        color: verdict(6),
        spacing: verdict(9),
        polish: verdict(5),
        brief: verdict(10),
      }),
    ).toBe(7.5);
  });
});
