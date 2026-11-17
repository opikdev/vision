import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RecentFiles } from './recent-files';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vision-recent-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('RecentFiles', () => {
  it('starts empty when nothing was stored', async () => {
    expect(await new RecentFiles(join(dir, 'recent.json')).list()).toEqual([]);
  });

  it('lists the newest first, without duplicates, and marks missing files', async () => {
    await writeFile(join(dir, 'a.vis'), '');
    await writeFile(join(dir, 'b.vis'), '');
    const recent = new RecentFiles(join(dir, 'recent.json'));
    await recent.add(join(dir, 'a.vis'));
    await recent.add(join(dir, 'gone.vis'));
    await recent.add(join(dir, 'b.vis'));
    await recent.add(join(dir, 'a.vis'));
    expect(await recent.list()).toEqual([
      { path: join(dir, 'a.vis'), name: 'a.vis', exists: true },
      { path: join(dir, 'b.vis'), name: 'b.vis', exists: true },
      { path: join(dir, 'gone.vis'), name: 'gone.vis', exists: false },
    ]);
  });

  it('keeps only the most recent files and persists them', async () => {
    const store = join(dir, 'nested', 'recent.json');
    const recent = new RecentFiles(store, 2);
    await recent.add('/x/1.vis');
    await recent.add('/x/2.vis');
    await recent.add('/x/3.vis');
    expect(JSON.parse(await readFile(store, 'utf8'))).toEqual({
      version: 1,
      paths: ['/x/3.vis', '/x/2.vis'],
    });
    expect((await new RecentFiles(store).list()).map((file) => file.path)).toEqual([
      '/x/3.vis',
      '/x/2.vis',
    ]);
  });

  it('removes a file', async () => {
    const recent = new RecentFiles(join(dir, 'recent.json'));
    await recent.add('/x/1.vis');
    await recent.add('/x/2.vis');
    await recent.remove('/x/1.vis');
    expect((await recent.list()).map((file) => file.path)).toEqual(['/x/2.vis']);
  });

  it('starts over when the stored list is corrupt', async () => {
    const store = join(dir, 'recent.json');
    await writeFile(store, '{"version":1,"paths":"nope"}');
    const recent = new RecentFiles(store);
    expect(await recent.list()).toEqual([]);
    await recent.add('/x/1.vis');
    expect((await recent.list()).map((file) => file.path)).toEqual(['/x/1.vis']);
  });

  it('keeps every file added at the same time', async () => {
    const recent = new RecentFiles(join(dir, 'recent.json'));
    await Promise.all(['/x/1.vis', '/x/2.vis', '/x/3.vis'].map((path) => recent.add(path)));
    expect((await recent.list()).map((file) => file.path)).toEqual([
      '/x/3.vis',
      '/x/2.vis',
      '/x/1.vis',
    ]);
  });

  it('reads the list again after a failed read', async () => {
    const store = join(dir, 'recent.json');
    await mkdir(store);
    const recent = new RecentFiles(store);
    await expect(recent.list()).rejects.toThrow('EISDIR');
    await rm(store, { recursive: true });
    await writeFile(store, '{"version":1,"paths":["/x/1.vis"]}');
    expect((await recent.list()).map((file) => file.path)).toEqual(['/x/1.vis']);
  });

  it('marks files it cannot reach as missing', async () => {
    await mkdir(join(dir, 'locked'));
    await writeFile(join(dir, 'locked', 'a.vis'), '');
    await chmod(join(dir, 'locked'), 0o000);
    const recent = new RecentFiles(join(dir, 'recent.json'));
    await recent.add(join(dir, 'locked', 'a.vis'));
    try {
      expect(await recent.list()).toEqual([
        { path: join(dir, 'locked', 'a.vis'), name: 'a.vis', exists: false },
      ]);
    } finally {
      await chmod(join(dir, 'locked'), 0o755);
    }
  });
});
