import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentActivity } from '../../../shared/contract';
import { useAgentStore } from './agent-store';
import { AgentTracker } from './agent-tracker';
import type { CursorTarget } from './cursor-geometry';

const session = 'session-1';
const at = (x: number): CursorTarget => ({ artboardId: 'cart', x, y: 0, onLabel: false });
const label: CursorTarget = { artboardId: 'cart', x: 0, y: 0, onLabel: true };

let tracker: AgentTracker;

function edit(nodes: string[]): AgentActivity {
  return {
    session,
    agent: 'Claude Code',
    activity: {
      kind: 'edit',
      artboard: 'cart',
      nodes,
      summary: `is adding ${nodes.length} elements to Cart`,
    },
  };
}

function presence() {
  const { agents, latest } = useAgentStore.getState();
  const current = latest === null ? undefined : agents[latest];
  return (
    current && {
      summary: current.summary,
      target: current.target,
      leaving: current.leaving,
      artboardId: current.artboardId,
    }
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  useAgentStore.setState({ agents: {}, latest: null });
  tracker = new AgentTracker({
    node: (id) => (id === 'existing' ? at(5) : null),
    label: () => label,
  });
});

afterEach(() => {
  tracker.dispose();
  vi.useRealTimers();
});

describe('AgentTracker', () => {
  it('follows each element as the save that adds them is revealed, then thinks', () => {
    tracker.receive(edit(['a', 'b']));
    expect(presence()).toEqual({
      summary: 'is adding 2 elements to Cart',
      target: label,
      leaving: false,
      artboardId: 'cart',
    });

    tracker.revealStarted(['a', 'b']);
    tracker.revealed('a', at(10));
    expect(presence()?.target).toEqual(at(10));
    vi.advanceTimersByTime(5000);
    tracker.revealed('b', at(20));
    expect(presence()).toMatchObject({ summary: 'is adding 2 elements to Cart', target: at(20) });

    tracker.revealEnded(['a', 'b']);
    expect(presence()).toMatchObject({ summary: 'is thinking', target: at(20) });
  });

  it('joins a reveal that started before the message arrived', () => {
    tracker.revealStarted(['a', 'b']);
    tracker.receive(edit(['a', 'b']));
    tracker.revealed('b', at(20));
    expect(presence()?.target).toEqual(at(20));
    tracker.revealEnded(['a', 'b']);
    expect(presence()?.summary).toBe('is thinking');
  });

  it('points at an element that is already drawn and thinks when no reveal follows', () => {
    tracker.receive(edit(['existing']));
    expect(presence()?.target).toEqual(at(5));
    vi.advanceTimersByTime(1499);
    expect(presence()?.summary).toBe('is adding 1 elements to Cart');
    vi.advanceTimersByTime(1);
    expect(presence()?.summary).toBe('is thinking');
  });

  it('shows no cursor for reveals no agent asked for', () => {
    tracker.revealStarted(['a']);
    tracker.revealed('a', at(10));
    tracker.revealEnded(['a']);
    expect(useAgentStore.getState()).toEqual({ agents: {}, latest: null });
  });

  it('looks at an artboard by its name, then thinks after 3 s', () => {
    tracker.receive({
      session,
      agent: 'Codex',
      activity: { kind: 'look', artboard: 'cart', summary: 'is taking a screenshot of Cart' },
    });
    expect(presence()).toEqual({
      summary: 'is taking a screenshot of Cart',
      target: label,
      leaving: false,
      artboardId: 'cart',
    });
    vi.advanceTimersByTime(3000);
    expect(presence()?.summary).toBe('is thinking');
  });

  it('looks at a layer it names', () => {
    tracker.receive({
      session,
      agent: 'Codex',
      activity: { kind: 'look', artboard: 'cart', node: 'existing', summary: 'is looking at Pay' },
    });
    expect(presence()).toMatchObject({ summary: 'is looking at Pay', target: at(5) });
  });

  it('fades away on done and after a minute without messages', () => {
    tracker.receive(edit(['existing']));
    vi.advanceTimersByTime(59_999);
    expect(presence()?.leaving).toBe(false);
    vi.advanceTimersByTime(1);
    expect(presence()?.leaving).toBe(true);
    vi.advanceTimersByTime(200);
    expect(useAgentStore.getState()).toEqual({ agents: {}, latest: null });

    tracker.receive(edit(['existing']));
    tracker.receive({ session, agent: 'Claude Code', activity: { kind: 'done' } });
    expect(presence()?.leaving).toBe(true);
    vi.advanceTimersByTime(200);
    expect(useAgentStore.getState()).toEqual({ agents: {}, latest: null });
  });

  it('comes back if a message arrives while it fades', () => {
    tracker.receive({ session, agent: 'Claude Code', activity: { kind: 'done' } });
    tracker.receive(edit(['existing']));
    tracker.receive({ session, agent: 'Claude Code', activity: { kind: 'done' } });
    tracker.receive(edit(['existing']));
    vi.advanceTimersByTime(200);
    expect(presence()?.leaving).toBe(false);
  });
});
