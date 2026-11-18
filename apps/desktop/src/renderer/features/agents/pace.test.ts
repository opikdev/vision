import { describe, expect, it } from 'vitest';
import { PaceEstimator } from './pace';

describe('PaceEstimator', () => {
  it('gives the first batch 3 s', () => {
    const pace = new PaceEstimator();
    expect(pace.budgetMs()).toBe(3000);
    pace.edited(1000);
    expect(pace.budgetMs()).toBe(3000);
  });

  it('plays a batch over 1.5 times the longer of the last gap and the smoothed gap', () => {
    const pace = new PaceEstimator();
    pace.edited(0);
    pace.edited(2000);
    expect(pace.budgetMs()).toBe(3000);
    pace.edited(8000);
    expect(pace.budgetMs()).toBe(9000);
    pace.edited(9000);
    expect(pace.budgetMs()).toBe(3750);
  });

  it('keeps the budget between 1.5 s and 15 s', () => {
    const pace = new PaceEstimator();
    pace.edited(0);
    pace.edited(200);
    expect(pace.budgetMs()).toBe(1500);
    pace.edited(60_200);
    expect(pace.budgetMs()).toBe(15_000);
  });
});
