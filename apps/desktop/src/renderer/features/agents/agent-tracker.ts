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

export class AgentTracker {
  readonly #locate: Locator;
  readonly #following = new Map<string, Set<string>>();
  readonly #timers = new Map<string, Timers>();
  #revealing = new Set<string>();

  constructor(locate: Locator) {
    this.#locate = locate;
  }

  receive({ session, agent, activity }: AgentActivity): void {
    if (activity.kind === 'done') {
      this.#leave(session);
      return;
    }
    const joinsReveal =
      activity.kind === 'edit' && activity.nodes.some((id) => this.#revealing.has(id));
    if (activity.kind === 'edit') this.#following.set(session, new Set(activity.nodes));
    const previous = useAgentStore.getState().agents[session]?.target ?? null;
    this.#put({
      session,
      agent,
      summary: activity.summary,
      artboardId: activity.artboard ?? null,
      target: joinsReveal ? previous : (this.#targetOf(activity) ?? previous),
      leaving: false,
    });
    useAgentStore.setState({ latest: session });
    const settleAfter = activity.kind === 'look' ? lookMs : settleMs;
    this.#schedule(session, joinsReveal ? undefined : settleAfter);
  }

  revealStarted(ids: readonly string[]): void {
    this.#revealing = new Set(ids);
    for (const session of this.#sessionsFollowing(ids)) this.#schedule(session, undefined);
  }

  revealed(id: string, target: CursorTarget): void {
    for (const session of this.#sessionsFollowing([id])) this.#patch(session, { target });
  }

  revealEnded(ids: readonly string[]): void {
    this.#revealing = new Set();
    for (const session of this.#sessionsFollowing(ids)) this.#settle(session);
  }

  dispose(): void {
    for (const session of [...this.#timers.keys()]) this.#clear(session);
  }

  #targetOf(activity: Work): CursorTarget | null {
    const first = activity.kind === 'edit' ? activity.nodes[0] : activity.node;
    const node = first === undefined ? null : this.#locate.node(first);
    return node ?? (activity.artboard === undefined ? null : this.#locate.label(activity.artboard));
  }

  #sessionsFollowing(ids: readonly string[]): string[] {
    return [...this.#following].flatMap(([session, nodes]) =>
      ids.some((id) => nodes.has(id)) ? [session] : [],
    );
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
    this.#following.delete(session);
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
