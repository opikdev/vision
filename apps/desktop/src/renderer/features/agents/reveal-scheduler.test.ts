import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RevealScheduler, staggerMs } from './reveal-scheduler';

let log: string[];

beforeEach(() => {
  vi.useFakeTimers();
  log = [];
});

afterEach(() => {
  vi.useRealTimers();
});

function handlers(name: string) {
  return {
    step: (id: string) => log.push(`${name} ${id} at ${Date.now()}`),
    end: () => log.push(`${name} end at ${Date.now()}`),
  };
}

describe('staggerMs', () => {
  it('waits 60 ms between elements, less when there are more than 25', () => {
    expect(staggerMs(1)).toBe(60);
    expect(staggerMs(25)).toBe(60);
    expect(staggerMs(100)).toBe(15);
  });
});

describe('RevealScheduler', () => {
  it('reveals elements in order and ends once the last outline fades', () => {
    vi.setSystemTime(0);
    new RevealScheduler<string>().start(['a', 'b', 'c'], handlers('save'));
    vi.runAllTimers();
    expect(log).toEqual(['save a at 0', 'save b at 60', 'save c at 120', 'save end at 520']);
  });

  it('reveals any number of elements within 1.5 s', () => {
    vi.setSystemTime(0);
    const ids = Array.from({ length: 300 }, (_, index) => `n${index}`);
    new RevealScheduler<string>().start(ids, handlers('save'));
    vi.runAllTimers();
    expect(log.at(-2)).toBe('save n299 at 1495');
    expect(log.at(-1)).toBe('save end at 1895');
  });

  it('finishes the running reveal at once when a newer save starts', () => {
    vi.setSystemTime(0);
    const scheduler = new RevealScheduler<string>();
    scheduler.start(['a', 'b', 'c'], handlers('first'));
    vi.advanceTimersByTime(70);
    scheduler.start(['d'], handlers('second'));
    vi.runAllTimers();
    expect(log).toEqual([
      'first a at 0',
      'first b at 60',
      'first end at 70',
      'second d at 70',
      'second end at 470',
    ]);
  });

  it('does nothing for an empty save and ends at most once', () => {
    vi.setSystemTime(0);
    const scheduler = new RevealScheduler<string>();
    scheduler.start([], handlers('empty'));
    scheduler.finish();
    expect(log).toEqual([]);
    scheduler.start(['a'], handlers('save'));
    scheduler.finish();
    scheduler.finish();
    expect(log).toEqual(['save end at 0']);
  });
});
