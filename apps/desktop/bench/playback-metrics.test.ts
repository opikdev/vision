import { describe, expect, it } from 'vitest';
import { playbackMetrics } from './playback-metrics';

describe('playbackMetrics', () => {
  it('finds the longest still from the start and the longest gap between changes', () => {
    const metrics = playbackMetrics({
      startedAt: 1000,
      doneAt: 9000,
      changes: [500, 6100, 8800, 9500],
      artboards: [6000],
      cursor: [],
    });
    expect(metrics.longestStillMs).toBe(5000);
    expect(metrics.longestGapMs).toBe(2700);
    expect(metrics.changes).toBe(2);
  });

  it('counts the whole time as still when nothing changes', () => {
    expect(
      playbackMetrics({ startedAt: 0, doneAt: 3000, changes: [], artboards: [], cursor: [] }),
    ).toMatchObject({
      longestStillMs: 3000,
      longestGapMs: 0,
    });
  });

  it('measures cursor speed over at least 100 ms and the longest jump between frames', () => {
    const metrics = playbackMetrics({
      startedAt: 0,
      doneAt: 1000,
      changes: [],
      artboards: [],
      cursor: [
        { at: 0, x: 0, y: 0 },
        { at: 50, x: 0, y: 0 },
        { at: 100, x: 30, y: 40 },
        { at: 150, x: 30, y: 40 },
        { at: 200, x: 90, y: 120 },
      ],
    });
    expect(metrics.cursorMaxSpeed).toBe(1000);
    expect(metrics.cursorLongestJump).toBe(100);
  });

  it('rejects a trace that never started', () => {
    expect(() =>
      playbackMetrics({ startedAt: null, doneAt: 10, changes: [], artboards: [], cursor: [] }),
    ).toThrow('The trace has no start or end');
  });
});
