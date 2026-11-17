import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const staleAfterMs = 10 * 60 * 1000;

export function createScreenshotProfile(root: string, nowMs = Date.now()): string {
  mkdirSync(root, { recursive: true });
  for (const name of readdirSync(root)) removeIfStale(join(root, name), nowMs);
  return mkdtempSync(join(root, 'profile-'));
}

function removeIfStale(dir: string, nowMs: number): void {
  try {
    if (nowMs - statSync(dir).mtimeMs > staleAfterMs) rmSync(dir, { recursive: true, force: true });
  } catch {
    // Another screenshot run may be sweeping the same folder; a leftover is swept next time.
  }
}
