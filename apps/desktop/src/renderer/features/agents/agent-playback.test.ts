import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentActivity } from '../../../shared/contract';
import { AgentPlayback, type RevealStep } from './agent-playback';
import { useAgentStore } from './agent-store';
import { AgentTracker } from './agent-tracker';

const cart = { id: 'cart', x: 0, y: 0 };

let log: string[];
let tracker: AgentTracker;
let playback: AgentPlayback;

function edit(session: string, nodes: string[]): AgentActivity {
  return {
    session,
    agent: 'Claude Code',
    activity: { kind: 'edit', artboard: 'cart', nodes, summary: `is adding ${nodes.join(', ')}` },
  };
}

function receive(message: AgentActivity): void {
  playback.receive(message);
  tracker.receive(message);
}

function steps(...ids: string[]): RevealStep[] {
  return ids.map((id) => ({ id, artboard: cart, added: id !== 'changed' }));
}

function summary(session: string): string | undefined {
  return useAgentStore.getState().agents[session]?.summary;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  log = [];
  useAgentStore.setState({ agents: {}, latest: null });
  tracker = new AgentTracker({ node: () => null, label: () => null });
  playback = new AgentPlayback(tracker, {
    hide: ({ id }) => log.push(`hide ${id} at ${Date.now()}`),
    show: ({ id }) => {
      log.push(`show ${id} at ${Date.now()}`);
      return { artboardId: 'cart', x: id.length, y: 0, onLabel: false };
    },
  });
});

afterEach(() => {
  tracker.dispose();
  vi.useRealTimers();
});

describe('AgentPlayback', () => {
  it("hides an agent's new elements and shows them at its pace, then thinks", () => {
    receive(edit('one', ['a', 'b', 'changed']));
    playback.play(steps('a', 'b', 'changed'));
    expect(log).toEqual(['hide a at 0', 'hide b at 0']);
    vi.advanceTimersByTime(1200);
    expect(summary('one')).toBe('is adding a, b, changed');
    vi.advanceTimersByTime(600);
    expect(log.slice(2)).toEqual(['show a at 600', 'show b at 1200', 'show changed at 1800']);
    expect(summary('one')).toBe('is thinking');
  });

  it('paces the next batch by the time the agent took to write it', () => {
    receive(edit('one', ['a']));
    playback.play(steps('a'));
    vi.advanceTimersByTime(1200);
    receive(edit('one', ['b', 'c', 'd', 'e']));
    playback.play(steps('b', 'c', 'd', 'e'));
    vi.runAllTimers();
    expect(log.filter((line) => line.startsWith('show'))).toEqual([
      'show a at 600',
      'show b at 1650',
      'show c at 2100',
      'show d at 2550',
      'show e at 3000',
    ]);
  });

  it('reveals saves no agent claims within 1.5 s', () => {
    playback.play(steps('a', 'b', 'c'));
    vi.runAllTimers();
    expect(log).toEqual([
      'hide a at 0',
      'hide b at 0',
      'hide c at 0',
      'show a at 60',
      'show b at 120',
      'show c at 180',
    ]);
    expect(useAgentStore.getState().agents).toEqual({});
  });

  it('plays two agents side by side, one queue each', () => {
    receive(edit('one', ['a', 'b']));
    receive(edit('two', ['x', 'y']));
    playback.play(steps('a', 'b'));
    playback.play(steps('x', 'y'));
    vi.advanceTimersByTime(600);
    expect(log.filter((line) => line.startsWith('show'))).toEqual([
      'show a at 600',
      'show x at 600',
    ]);
  });

  it("finishes an agent's playback within 300 ms once it's done", () => {
    receive(edit('one', ['a', 'b', 'c']));
    playback.play(steps('a', 'b', 'c'));
    receive({ session: 'one', agent: 'Claude Code', activity: { kind: 'done' } });
    vi.advanceTimersByTime(300);
    expect(log.slice(3)).toEqual(['show a at 100', 'show b at 200', 'show c at 300']);
  });

  it('finishes every queue within 300 ms when hurried', () => {
    receive(edit('one', ['a', 'b']));
    playback.play(steps('a', 'b'));
    playback.play(steps('x'));
    playback.hurry();
    vi.advanceTimersByTime(300);
    expect(log.filter((line) => line.startsWith('show')).toSorted()).toEqual([
      'show a at 150',
      'show b at 300',
      'show x at 60',
    ]);
  });

  it('hides waiting elements again after a redraw and shows them all on flush', () => {
    receive(edit('one', ['a', 'changed']));
    playback.play(steps('a', 'changed'));
    log = [];
    playback.hideWaiting();
    expect(log).toEqual(['hide a at 0']);
    playback.flush();
    expect(log.slice(1)).toEqual(['show a at 0', 'show changed at 0']);
    expect(summary('one')).toBe('is thinking');
  });
});
