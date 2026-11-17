import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createScreenshotProfile } from './screenshot-profile';

let root: string;

beforeEach(() => {
  root = join(mkdtempSync(join(tmpdir(), 'vision-profiles-')), 'screenshots');
});

afterEach(() => {
  rmSync(join(root, '..'), { recursive: true, force: true });
});

describe('createScreenshotProfile', () => {
  it('creates a fresh profile folder and removes ones left by runs over ten minutes ago', () => {
    mkdirSync(join(root, 'profile-old'), { recursive: true });
    mkdirSync(join(root, 'profile-recent'));
    const now = Date.now();
    utimesSync(join(root, 'profile-old'), new Date(now - 11 * 60_000), new Date(now - 11 * 60_000));
    const created = createScreenshotProfile(root, now);
    expect(readdirSync(root).sort()).toEqual(
      [created.slice(root.length + 1), 'profile-recent'].sort(),
    );
    expect(created.startsWith(join(root, 'profile-'))).toBe(true);
  });

  it('skips entries another run removed while it was sweeping', () => {
    mkdirSync(root, { recursive: true });
    symlinkSync(join(root, 'removed'), join(root, 'profile-vanishing'));
    const created = createScreenshotProfile(root);
    expect(existsSync(created)).toBe(true);
  });
});
