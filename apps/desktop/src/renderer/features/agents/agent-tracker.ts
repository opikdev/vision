import type { Activity } from '@vision/activity';
import type { AgentActivity } from '../../../shared/contract';
import { useAgentStore, type AgentPresence } from './agent-store';
import type { CursorTarget } from './cursor-geometry';

export interface Locator {
  node(id: string): CursorTarget | null;
  label(artboardId: string): CursorTarget | null;
}

type Work = Exclude<Activity, { kind: 'done' }>;

export const thinking = 'is thinking';
export const idleMs = 60_000;
export const lookMs = 3000;
export const settleMs = 1500;
export const leaveMs = 200;

interface Timers {
  idle?: ReturnType<typeof setTimeout> | undefined;
  settle?: ReturnType<typeof setTimeout> | undefined;
}

export interface Claim {
  session: string;
  summary: string;
}

export class AgentTracker {
  readonly #locate: Locator;
  readonly #following = new Map<string, { summary: string; nodes: ReadonlySet<string> }>();
  readonly #timers = new Map<string, Timers>();
  readonly #playing = new Set<string>();

  constructor(locate: Locator) {
    this.#locate = locate;
  }

  receive({ session, agent, activity }: AgentActivity): void {
    if (activity.kind === 'done') {
      this.#leave(session);
      return;
    }
    if (activity.kind === 'edit') {
      const { summary } = activity;
      this.#following.set(session, { summary, nodes: new Set(activity.nodes) });
    }
    const current = useAgentStore.getState().agents[session];
    const playing = this.#playing.has(session) && current !== undefined;
    this.#put({
      session,
      agent,
      summary: playing ? current.summary : activity.summary,
      artboardId: activity.artboard ?? null,
      target: playing ? current.target : (this.#targetOf(activity) ?? current?.target ?? null),
      leaving: false,
    });
    useAgentStore.setState({ latest: session });
    if (playing) this.#schedule(session, undefined);
    else this.#schedule(session, activity.kind === 'look' ? lookMs : settleMs);
  }

  claim(ids: readonly string[]): Claim | null {
    for (const [session, { summary, nodes }] of this.#following) {
      if (!ids.some((id) => nodes.has(id))) continue;
      this.#following.delete(session);
      return { session, summary };
    }
    return null;
  }

  playing(session: string, target: CursorTarget, summary: string): void {
    if (useAgentStore.getState().agents[session]?.leaving !== false) return;
    this.#playing.add(session);
    clearTimeout(this.#timers.get(session)?.settle);
    this.#patch(session, { target, summary });
  }

  played(session: string): void {
    if (!this.#playing.delete(session)) return;
    this.#settle(session);
  }

  dispose(): void {
    for (const session of [...this.#timers.keys()]) this.#clear(session);
  }

  #targetOf(activity: Work): CursorTarget | null {
    const first = activity.kind === 'edit' ? activity.nodes[0] : activity.node;
    const node = first === undefined ? null : this.#locate.node(first);
    return node ?? (activity.artboard === undefined ? null : this.#locate.label(activity.artboard));
  }

  #schedule(session: string, settleAfter: number | undefined): void {
    const timers = this.#timers.get(session) ?? {};
    clearTimeout(timers.idle);
    clearTimeout(timers.settle);
    timers.idle = setTimeout(() => {
      this.#leave(session);
    }, idleMs);
    timers.settle =
      settleAfter === undefined
        ? undefined
        : setTimeout(() => {
            this.#settle(session);
          }, settleAfter);
    this.#timers.set(session, timers);
  }

  #settle(session: string): void {
    clearTimeout(this.#timers.get(session)?.settle);
    this.#patch(session, { summary: thinking });
  }

  #leave(session: string): void {
    this.#clear(session);
    this.#patch(session, { leaving: true });
    setTimeout(() => {
      const { agents, latest } = useAgentStore.getState();
      if (agents[session]?.leaving !== true) return;
      useAgentStore.setState({
        agents: Object.fromEntries(Object.entries(agents).filter(([key]) => key !== session)),
        latest: latest === session ? null : latest,
      });
    }, leaveMs);
  }

  #clear(session: string): void {
    const timers = this.#timers.get(session);
    clearTimeout(timers?.idle);
    clearTimeout(timers?.settle);
    this.#timers.delete(session);
    this.#following.delete(session);
    this.#playing.delete(session);
  }

  #put(presence: AgentPresence): void {
    const { agents } = useAgentStore.getState();
    useAgentStore.setState({ agents: { ...agents, [presence.session]: presence } });
  }

  #patch(session: string, patch: Partial<AgentPresence>): void {
    const current = useAgentStore.getState().agents[session];
    if (current !== undefined) this.#put({ ...current, ...patch });
  }
}
