import { describe, expect, it } from 'vitest';
import { atRest, glideFrom, glideToward, type Glide } from './glide';

function run(from: Glide, to: { x: number; y: number }, frames: number, maxSpeed = 1500) {
  const path = [from];
  for (let frame = 0; frame < frames; frame++) {
    const last = path.at(-1) ?? from;
    path.push(glideToward(last, to, 16, maxSpeed));
  }
  return path;
}

describe('glideToward', () => {
  it('eases into a near target and comes to rest on it', () => {
    const path = run(glideFrom({ x: 0, y: 0 }), { x: 100, y: 0 }, 60);
    const steps = path.slice(1).map((point, index) => point.x - (path[index]?.x ?? 0));
    expect(steps.every((step) => step >= 0)).toBe(true);
    expect(steps.at(-1)).toBeLessThan(steps[3] ?? 0);
    expect(path.every(({ x }) => x <= 100)).toBe(true);
    const last = path.at(-1) ?? glideFrom({ x: 0, y: 0 });
    expect(atRest(last, { x: 100, y: 0 })).toBe(true);
  });

  it('never moves faster than the max speed toward a far target', () => {
    const path = run(glideFrom({ x: 0, y: 0 }), { x: 3000, y: 4000 }, 120, 1000);
    const fastest = Math.max(
      ...path.slice(1).map((point, index) => {
        const previous = path[index] ?? point;
        return (Math.hypot(point.x - previous.x, point.y - previous.y) / 16) * 1000;
      }),
    );
    expect(fastest).toBeLessThanOrEqual(1000);
    expect(fastest).toBeGreaterThan(900);
  });

  it('keeps its speed when the target changes mid-glide', () => {
    const moving = run(glideFrom({ x: 0, y: 0 }), { x: 200, y: 0 }, 6).at(-1);
    if (moving === undefined) throw new Error('No glide');
    const turned = glideToward(moving, { x: 200, y: 200 }, 16, 1500);
    expect(turned.vx).toBeGreaterThan(0);
    expect(turned.x).toBeGreaterThan(moving.x);
    expect(turned.vy).toBeGreaterThan(0);
  });

  it('stops on the target instead of overshooting it', () => {
    expect(glideToward({ x: 0, y: 0, vx: 5000, vy: 0 }, { x: 10, y: 0 }, 16, 1500)).toEqual({
      x: 10,
      y: 0,
      vx: 0,
      vy: 0,
    });
  });
});
