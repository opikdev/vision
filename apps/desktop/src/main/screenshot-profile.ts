import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const staleAfterMs = 10 * 60 * 1000;

export function createScreenshotProfile(root: string, nowMs = Date.now()): string {
  mkdirSync(root, { recursive: true });
  for (const name of readdirSync(root)) {
    const dir = join(root, name);
    if (nowMs - statSync(dir).mtimeMs > staleAfterMs) rmSync(dir, { recursive: true, force: true });
  }
  return mkdtempSync(join(root, 'profile-'));
}
