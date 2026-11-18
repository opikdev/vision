import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Playback } from './playback';

let log: string[];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  log = [];
});

afterEach(() => {
  vi.useRealTimers();
});

function playback(minStepMs = 40, maxStepMs = 600): Playback<string> {
  return new Playback<string>(
    {
      show: (step) => log.push(`${step} at ${Date.now()}`),
      drained: () => log.push(`drained at ${Date.now()}`),
    },
    { minStepMs, maxStepMs },
  );
}

describe('Playback', () => {
  it('spreads a batch over its budget in order', () => {
    playback().push(['a', 'b', 'c'], 1500);
    vi.runAllTimers();
    expect(log).toEqual(['a at 500', 'b at 1000', 'c at 1500', 'drained at 1500']);
  });

  it('keeps steps between 40 and 600 ms apart', () => {
    const fast = playback();
    fast.push(['a', 'b', 'c'], 60);
    vi.runAllTimers();
    const slow = playback();
    slow.push(['d', 'e'], 15_000);
    vi.runAllTimers();
    expect(log).toEqual([
      'a at 40',
      'b at 80',
      'c at 120',
      'drained at 120',
      'd at 720',
      'e at 1320',
      'drained at 1320',
    ]);
  });

  it('speeds up waiting steps to share the budget of a batch that arrives early', () => {
    const queue = playback();
    queue.push(['a', 'b', 'c', 'd'], 2000);
    vi.advanceTimersByTime(700);
    queue.push(['e', 'f'], 1000);
    expect(queue.pending).toEqual(['b', 'c', 'd', 'e', 'f']);
    vi.runAllTimers();
    expect(log).toEqual([
      'a at 500',
      'b at 900',
      'c at 1100',
      'd at 1300',
      'e at 1500',
      'f at 1700',
      'drained at 1700',
    ]);
  });

  it('never slows waiting steps down for a batch with a longer budget', () => {
    const queue = playback();
    queue.push(['a', 'b'], 1000);
    vi.advanceTimersByTime(600);
    queue.push(['c'], 15_000);
    vi.runAllTimers();
    expect(log).toEqual(['a at 500', 'b at 1000', 'c at 1600', 'drained at 1600']);
  });

  it('finishes within the given time, several steps a frame if needed', () => {
    const queue = playback();
    queue.push(['a', 'b', 'c', 'd'], 10_000);
    vi.advanceTimersByTime(100);
    queue.finish(20);
    vi.runAllTimers();
    queue.push(['e', 'f'], 20);
    vi.runAllTimers();
    expect(log).toEqual([
      'a at 105',
      'b at 110',
      'c at 115',
      'd at 120',
      'drained at 120',
      'e at 160',
      'f at 200',
      'drained at 200',
    ]);
  });

  it('never shows a step later than it would have without finishing', () => {
    const queue = playback(0, 60);
    queue.push(['a'], 1500);
    queue.finish(300);
    vi.runAllTimers();
    expect(log).toEqual(['a at 60', 'drained at 60']);
  });

  it('shows everything at once on flush and drains only when something was waiting', () => {
    const queue = playback();
    queue.flush();
    queue.finish(300);
    queue.push(['a', 'b'], 3000);
    queue.flush();
    vi.runAllTimers();
    expect(log).toEqual(['a at 0', 'b at 0', 'drained at 0']);
    expect(queue.pending).toEqual([]);
  });

  it('shows nothing for an empty batch', () => {
    playback().push([], 3000);
    vi.runAllTimers();
    expect(log).toEqual([]);
  });
});
