export interface CursorSample {
  at: number;
  x: number;
  y: number;
}

export interface Trace {
  startedAt: number | null;
  doneAt: number | null;
  changes: number[];
  artboards: number[];
  cursor: CursorSample[];
}

export interface PlaybackMetrics {
  longestStillMs: number;
  longestGapMs: number;
  cursorMaxSpeed: number;
  cursorLongestJump: number;
  changes: number;
}

const speedWindowMs = 100;

export function playbackMetrics(trace: Trace): PlaybackMetrics {
  const { startedAt, doneAt, cursor } = trace;
  if (startedAt === null || doneAt === null) throw new Error('The trace has no start or end');
  const working = (times: readonly number[]) =>
    times.filter((at) => at > startedAt && at < doneAt).toSorted((a, b) => a - b);
  const changes = working(trace.changes);
  let cursorMaxSpeed = 0;
  let cursorLongestJump = 0;
  let from = 0;
  for (const [index, sample] of cursor.entries()) {
    const previous = cursor[index - 1];
    if (previous !== undefined) {
      cursorLongestJump = Math.max(cursorLongestJump, distance(previous, sample));
    }
    while (sample.at - (cursor[from + 1]?.at ?? Infinity) >= speedWindowMs) from++;
    const start = cursor[from];
    if (start !== undefined && sample.at - start.at >= speedWindowMs) {
      const speed = (distance(start, sample) / (sample.at - start.at)) * 1000;
      cursorMaxSpeed = Math.max(cursorMaxSpeed, speed);
    }
  }
  return {
    longestStillMs: longestGap([
      startedAt,
      ...working([...trace.changes, ...trace.artboards]),
      doneAt,
    ]),
    longestGapMs: longestGap(changes),
    cursorMaxSpeed,
    cursorLongestJump,
    changes: changes.length,
  };
}

function longestGap(marks: readonly number[]): number {
  return Math.max(0, ...marks.slice(1).map((at, index) => at - (marks[index] ?? at)));
}

function distance(a: CursorSample, b: CursorSample): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
