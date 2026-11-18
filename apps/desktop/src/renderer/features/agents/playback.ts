export interface PlaybackOptions {
  minStepMs: number;
  maxStepMs: number;
  now?: () => number;
}

export interface PlaybackHandlers<Step> {
  show: (step: Step) => void;
  drained: () => void;
}

interface Queued<Step> {
  step: Step;
  dueBy: number;
}

// Shows queued steps one at a time, spreading each batch over its budget. A batch that arrives
// while steps are still waiting shares its budget with them, so they only ever speed up.
export class Playback<Step> {
  readonly #handlers: PlaybackHandlers<Step>;
  readonly #minStepMs: number;
  readonly #maxStepMs: number;
  readonly #now: () => number;
  #queue: Queued<Step>[] = [];
  #lastShownAt = 0;
  #hurrying = false;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    handlers: PlaybackHandlers<Step>,
    { minStepMs, maxStepMs, now = () => Date.now() }: PlaybackOptions,
  ) {
    this.#handlers = handlers;
    this.#minStepMs = minStepMs;
    this.#maxStepMs = maxStepMs;
    this.#now = now;
  }

  get pending(): readonly Step[] {
    return this.#queue.map(({ step }) => step);
  }

  push(steps: readonly Step[], budgetMs: number): void {
    if (steps.length === 0) return;
    const now = this.#now();
    if (this.#queue.length === 0) this.#lastShownAt = now;
    this.#queue.push(...steps.map((step) => ({ step, dueBy: Number.POSITIVE_INFINITY })));
    this.#spread(now, budgetMs, this.#queue.length);
    this.#schedule();
  }

  finish(withinMs: number): void {
    if (this.#queue.length === 0) return;
    this.#hurrying = true;
    this.#spread(this.#now(), withinMs, this.#queue.length);
    this.#schedule();
  }

  flush(): void {
    clearTimeout(this.#timer);
    const queue = this.#queue;
    this.#queue = [];
    this.#hurrying = false;
    for (const { step } of queue) this.#handlers.show(step);
    if (queue.length > 0) this.#handlers.drained();
  }

  #spread(now: number, withinMs: number, count: number): void {
    this.#queue.forEach((queued, index) => {
      queued.dueBy = Math.min(queued.dueBy, now + (withinMs * (index + 1)) / count);
    });
  }

  #nextAt(): number {
    const next = this.#queue[0];
    if (next === undefined) return Number.POSITIVE_INFINITY;
    const earliest = this.#hurrying ? 0 : this.#lastShownAt + this.#minStepMs;
    const latest = this.#lastShownAt + this.#maxStepMs;
    return Math.min(latest, Math.max(earliest, next.dueBy));
  }

  #schedule(): void {
    clearTimeout(this.#timer);
    if (this.#queue.length === 0) return;
    this.#timer = setTimeout(
      () => {
        this.#tick();
      },
      Math.max(0, this.#nextAt() - this.#now()),
    );
  }

  #tick(): void {
    const now = this.#now();
    while (this.#nextAt() <= now) {
      const next = this.#queue.shift();
      if (next === undefined) break;
      this.#lastShownAt = now;
      this.#handlers.show(next.step);
    }
    if (this.#queue.length > 0) {
      this.#schedule();
      return;
    }
    this.#hurrying = false;
    this.#handlers.drained();
  }
}
