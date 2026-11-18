import { describe, expect, it } from 'vitest';
import { recordingFromTranscript } from './recording';

const file = '/tmp/design.vis';

function call(at: string, id: string, name: string, input: Record<string, unknown>): string {
  return JSON.stringify({
    type: 'assistant',
    timestamp: at,
    message: { content: [{ type: 'tool_use', id, name: `mcp__vision__${name}`, input }] },
  });
}

function result(at: string, id: string, isError = false): string {
  return JSON.stringify({
    type: 'user',
    timestamp: at,
    message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError }] },
  });
}

describe('recordingFromTranscript', () => {
  it('replays edits as snapshots and reads as looks, timed from the transcript', () => {
    const transcript = [
      JSON.stringify({ type: 'system', subtype: 'init' }),
      call('2026-01-01T10:00:00.000Z', 'a', 'get_guide', { file }),
      result('2026-01-01T10:00:00.100Z', 'a'),
      call('2026-01-01T10:00:01.000Z', 'b', 'write_html', {
        file,
        parent: 'desktop',
        html: '<div class="p-4"><p>Hi</p></div>',
      }),
      result('2026-01-01T10:00:05.000Z', 'b'),
      call('2026-01-01T10:00:06.000Z', 'c', 'update_node', { file, id: 'nope', text: 'x' }),
      result('2026-01-01T10:00:06.500Z', 'c', true),
      call('2026-01-01T10:00:07.000Z', 'd', 'screenshot', { file, artboard: 'desktop' }),
      result('2026-01-01T10:00:08.000Z', 'd'),
      call('2026-01-01T10:00:09.000Z', 'e', 'update_node', { file, id: 'p-1', text: 'Hello' }),
      result('2026-01-01T10:00:09.250Z', 'e'),
    ].join('\n');

    const recording = recordingFromTranscript(transcript);

    expect(recording.agent).toBe('Claude Code');
    expect(JSON.parse(recording.start)).toMatchObject({ pages: [{ id: 'page-1' }] });
    expect(recording.steps.map(({ delayMs, activity }) => ({ delayMs, activity }))).toEqual([
      {
        delayMs: 5000,
        activity: {
          kind: 'edit',
          artboard: 'desktop',
          nodes: ['div-1', 'p-1'],
          summary: 'is adding 2 elements to Desktop',
        },
      },
      {
        delayMs: 2000,
        activity: {
          kind: 'look',
          artboard: 'desktop',
          summary: 'is taking a screenshot of Desktop',
        },
      },
      {
        delayMs: 2250,
        activity: {
          kind: 'edit',
          artboard: 'desktop',
          nodes: ['p-1'],
          summary: 'is editing 1 element in Desktop',
        },
      },
    ]);
    expect(recording.steps[1]?.design).toBeUndefined();
    expect(JSON.parse(recording.steps[2]?.design ?? '')).toMatchObject({
      pages: [{ artboards: [{ children: [{ id: 'div-1', children: [{ text: 'Hello' }] }] }] }],
    });
  });
});
