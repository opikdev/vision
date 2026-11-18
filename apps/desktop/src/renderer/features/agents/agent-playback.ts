import type { AgentActivity } from '../../../shared/contract';
import type { Placed } from '../canvas/drawn-nodes';
import type { AgentTracker } from './agent-tracker';
import type { CursorTarget } from './cursor-geometry';
import { PaceEstimator } from './pace';
import { Playback } from './playback';

export interface RevealStep {
  id: string;
  artboard: Placed;
  added: boolean;
}

export interface Stage {
  hide(step: RevealStep): void;
  show(step: RevealStep): CursorTarget | null;
}

interface AgentStep extends RevealStep {
  summary: string;
}

interface Session {
  playback: Playback<AgentStep>;
  pace: PaceEstimator;
  ended: boolean;
}

export const finishMs = 300;
const agentSteps = { minStepMs: 40, maxStepMs: 600 };
const saveSteps = { minStepMs: 0, maxStepMs: 60 };
const saveMs = 1500;

// Plays each agent's edits element by element at the pace it writes them, one queue per session.
// Saves no agent claims, such as a person's, reveal within 1.5 s.
export class AgentPlayback {
  readonly #tracker: AgentTracker;
  readonly #stage: Stage;
  readonly #sessions = new Map<string, Session>();
  readonly #saves: Playback<RevealStep>;

  constructor(tracker: AgentTracker, stage: Stage) {
    this.#tracker = tracker;
    this.#stage = stage;
    this.#saves = new Playback(
      {
        show: (step) => {
          stage.show(step);
        },
        drained: () => undefined,
      },
      saveSteps,
    );
  }

  receive({ session, activity }: AgentActivity): void {
    if (activity.kind === 'edit') this.#session(session).pace.edited(Date.now());
    const ending = this.#sessions.get(session);
    if (activity.kind !== 'done' || ending === undefined) return;
    if (ending.playback.pending.length === 0) this.#sessions.delete(session);
    ending.ended = true;
    ending.playback.finish(finishMs);
  }

  play(steps: readonly RevealStep[]): void {
    if (steps.length === 0) return;
    for (const step of steps) if (step.added) this.#stage.hide(step);
    const claim = this.#tracker.claim(steps.map(({ id }) => id));
    if (claim === null) {
      this.#saves.push(steps, saveMs);
      return;
    }
    const { playback, pace } = this.#session(claim.session);
    playback.push(
      steps.map((step) => ({ ...step, summary: claim.summary })),
      pace.budgetMs(),
    );
  }

  hideWaiting(): void {
    for (const step of this.#waiting()) if (step.added) this.#stage.hide(step);
  }

  hurry(): void {
    for (const playback of this.#playbacks()) playback.finish(finishMs);
  }

  flush(): void {
    for (const playback of this.#playbacks()) playback.flush();
  }

  #waiting(): RevealStep[] {
    return this.#playbacks().flatMap((playback) => playback.pending);
  }

  #playbacks(): Pick<Playback<RevealStep>, 'pending' | 'finish' | 'flush'>[] {
    return [this.#saves, ...Array.from(this.#sessions.values(), ({ playback }) => playback)];
  }

  #session(session: string): Session {
    const existing = this.#sessions.get(session);
    if (existing !== undefined) return existing;
    const created: Session = {
      ended: false,
      pace: new PaceEstimator(),
      playback: new Playback<AgentStep>(
        {
          show: (step) => {
            const target = this.#stage.show(step);
            if (target !== null) this.#tracker.playing(session, target, step.summary);
          },
          drained: () => {
            this.#tracker.played(session);
            if (created.ended) this.#sessions.delete(session);
          },
        },
        agentSteps,
      ),
    };
    this.#sessions.set(session, created);
    return created;
  }
}
