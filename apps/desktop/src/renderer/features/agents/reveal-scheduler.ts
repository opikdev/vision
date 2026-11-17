export interface RevealHandlers<Step> {
  step: (step: Step) => void;
  end: () => void;
}

const maxStaggerMs = 60;
const maxRevealMs = 1500;
const outlineMs = 400;

export function staggerMs(count: number): number {
  return Math.min(maxStaggerMs, maxRevealMs / count);
}

export class RevealScheduler<Step> {
  #timers: ReturnType<typeof setTimeout>[] = [];
  #end: (() => void) | undefined;

  start(steps: readonly Step[], handlers: RevealHandlers<Step>): void {
    this.finish();
    if (steps.length === 0) return;
    const stagger = staggerMs(steps.length);
    this.#end = handlers.end;
    steps.forEach((step, index) => {
      this.#timers.push(
        setTimeout(() => {
          handlers.step(step);
        }, index * stagger),
      );
    });
    this.#timers.push(
      setTimeout(
        () => {
          this.finish();
        },
        (steps.length - 1) * stagger + outlineMs,
      ),
    );
  }

  finish(): void {
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers = [];
    const end = this.#end;
    this.#end = undefined;
    end?.();
  }
}
