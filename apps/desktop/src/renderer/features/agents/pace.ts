export const firstBudgetMs = 3000;
export const minBudgetMs = 1500;
export const maxBudgetMs = 15_000;
const smoothing = 0.5;
const headroom = 1.5;

// An agent takes about as long to write its next batch as it took to write this one, so a
// batch plays over a little more than its edit-to-edit gap: the screen keeps moving until the
// next batch arrives, and one that arrives early speeds up whatever is still waiting.
export class PaceEstimator {
  #lastEditAt: number | undefined;
  #lastGapMs: number | undefined;
  #averageGapMs: number | undefined;

  edited(at: number): void {
    if (this.#lastEditAt !== undefined) {
      const gap = at - this.#lastEditAt;
      this.#lastGapMs = gap;
      this.#averageGapMs =
        this.#averageGapMs === undefined
          ? gap
          : this.#averageGapMs + smoothing * (gap - this.#averageGapMs);
    }
    this.#lastEditAt = at;
  }

  budgetMs(): number {
    if (this.#lastGapMs === undefined || this.#averageGapMs === undefined) return firstBudgetMs;
    const gap = Math.max(this.#lastGapMs, this.#averageGapMs);
    return Math.min(maxBudgetMs, Math.max(minBudgetMs, gap * headroom));
  }
}
