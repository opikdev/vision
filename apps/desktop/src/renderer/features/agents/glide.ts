import type { Point } from '../canvas/viewport';

export interface Glide extends Point {
  vx: number;
  vy: number;
}

export const glideSmoothMs = 150;
export const maxGlideSpeed = 1500;
const restDistance = 0.5;
const restSpeed = 5;

export function glideFrom(point: Point): Glide {
  return { x: point.x, y: point.y, vx: 0, vy: 0 };
}

// A critically damped spring toward the target (Unity's SmoothDamp): a new target bends the path
// instead of restarting it, so the cursor never jumps, and far targets don't make it race.
export function glideToward(
  state: Glide,
  target: Point,
  elapsedMs: number,
  maxSpeed: number,
): Glide {
  const smooth = glideSmoothMs / 1000;
  const dt = Math.max(elapsedMs, 1) / 1000;
  const omega = 2 / smooth;
  const step = omega * dt;
  const decay = 1 / (1 + step + 0.48 * step * step + 0.235 * step * step * step);
  let changeX = state.x - target.x;
  let changeY = state.y - target.y;
  const distance = Math.hypot(changeX, changeY);
  const maxChange = maxSpeed * smooth;
  if (distance > maxChange) {
    changeX *= maxChange / distance;
    changeY *= maxChange / distance;
  }
  const tempX = (state.vx + omega * changeX) * dt;
  const tempY = (state.vy + omega * changeY) * dt;
  const next = {
    x: state.x - changeX + (changeX + tempX) * decay,
    y: state.y - changeY + (changeY + tempY) * decay,
    vx: (state.vx - omega * tempX) * decay,
    vy: (state.vy - omega * tempY) * decay,
  };
  const passed =
    (target.x - state.x) * (next.x - target.x) + (target.y - state.y) * (next.y - target.y) > 0;
  return passed ? glideFrom(target) : next;
}

export function atRest(state: Glide, target: Point): boolean {
  return (
    Math.hypot(state.x - target.x, state.y - target.y) < restDistance &&
    Math.hypot(state.vx, state.vy) < restSpeed
  );
}
