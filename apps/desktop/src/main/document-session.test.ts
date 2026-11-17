import { createDocument, serializeDocument } from '@vision/format';
import { writeDesign } from '@vision/format/node';
import type * as Chokidar from 'chokidar';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentState } from '../shared/contract';
import { openDocumentSession, type DocumentSession } from './document-session';

const watchers = vi.hoisted(() => [] as Chokidar.FSWatcher[]);

vi.mock('chokidar', async (importOriginal) => {
  const chokidar = await importOriginal<typeof Chokidar>();
  return {
    ...chokidar,
    watch: (...args: Parameters<typeof chokidar.watch>) => {
      const watcher = chokidar.watch(...args);
      watchers.push(watcher);
      return watcher;
    },
  };
});

let dir: string;
let path: string;
let session: DocumentSession | undefined;
let states: DocumentState[];

const valid = createDocument();
const renamed = createDocument();
for (const page of renamed.pages) page.name = 'Renamed';
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 400));

beforeEach(async () => {
  dir = await realpath(await mkdtemp(join(tmpdir(), 'vision-session-')));
  path = join(dir, 'design.vis');
  states = [];
});

afterEach(async () => {
  await session?.close();
  session = undefined;
  await rm(dir, { recursive: true, force: true });
});

async function open(): Promise<DocumentSession> {
  session = await openDocumentSession({
    path,
    assetToken: 'token',
    debounceMs: 20,
    onChange: (state) => states.push(state),
  });
  return session;
}

function summary(state: DocumentState | undefined) {
  return (
    state && {
      revision: state.revision,
      status: state.status,
      pageName: state.document?.pages[0]?.name ?? null,
      codes: state.diagnostics.map((diagnostic) => diagnostic.code),
      hasMtime: state.mtimeMs !== null,
    }
  );
}

describe('openDocumentSession', () => {
  it('reads the file when it opens', async () => {
    await writeDesign(path, valid);
    const opened = await open();
    expect(opened.state()).toMatchObject({
      revision: 1,
      path,
      name: 'design.vis',
      status: 'ok',
      document: valid,
      diagnostics: [],
      readError: null,
      assetToken: 'token',
      assetsVersion: 0,
    });
    expect(states).toHaveLength(1);
  });

  it('keeps the last valid document when a save is invalid, then recovers', async () => {
    await writeDesign(path, valid);
    await open();
    await writeFile(path, '{ "format": "vision", ');
    await expect
      .poll(() => summary(states.at(-1)))
      .toEqual({
        revision: 2,
        status: 'invalid',
        pageName: 'Page 1',
        codes: ['json-syntax'],
        hasMtime: true,
      });
    await writeDesign(path, renamed);
    await expect
      .poll(() => summary(states.at(-1)))
      .toEqual({
        revision: 3,
        status: 'ok',
        pageName: 'Renamed',
        codes: [],
        hasMtime: true,
      });
  });

  it('has no document when the file was never valid', async () => {
    await writeFile(path, '[]');
    expect(summary((await open()).state())).toEqual({
      revision: 1,
      status: 'invalid',
      pageName: null,
      codes: ['schema'],
      hasMtime: true,
    });
  });

  it('reports a deleted file as missing and picks it up when it comes back', async () => {
    await writeDesign(path, valid);
    await open();
    await rm(path);
    await expect
      .poll(() => summary(states.at(-1)))
      .toEqual({
        revision: 2,
        status: 'missing',
        pageName: 'Page 1',
        codes: [],
        hasMtime: false,
      });
    await writeDesign(path, renamed);
    await expect
      .poll(() => summary(states.at(-1)))
      .toEqual({
        revision: 3,
        status: 'ok',
        pageName: 'Renamed',
        codes: [],
        hasMtime: true,
      });
  });

  it('ignores temp files, other files and saves with identical content', async () => {
    await writeDesign(path, valid);
    await open();
    await writeFile(join(dir, `.design.vis.${crypto.randomUUID()}.tmp`), 'partial');
    await writeFile(join(dir, 'other.vis'), serializeDocument(renamed));
    await writeFile(path, serializeDocument(valid));
    await settle();
    expect(states.map((state) => state.revision)).toEqual([1]);
  });

  it('coalesces a burst of saves into one update', async () => {
    await writeDesign(path, valid);
    await open();
    await writeFile(path, '{');
    await writeFile(path, '{ "format"');
    await writeDesign(path, renamed);
    await settle();
    expect(states.map(summary)).toEqual([
      { revision: 1, status: 'ok', pageName: 'Page 1', codes: [], hasMtime: true },
      { revision: 2, status: 'ok', pageName: 'Renamed', codes: [], hasMtime: true },
    ]);
  });

  it('warns about missing images', async () => {
    const withImage = createDocument();
    for (const artboard of withImage.pages.flatMap((page) => page.artboards)) {
      artboard.children = [{ type: 'image', id: 'hero', src: 'hero.png' }];
    }
    await writeDesign(path, withImage);
    expect((await open()).state().diagnostics.map((d) => [d.severity, d.code])).toEqual([
      ['warning', 'missing-asset'],
    ]);
  });

  it('fails to open an unreadable file and stops watching', async () => {
    await mkdir(path);
    await expect(open()).rejects.toThrow('EISDIR');
    expect(watchers.at(-1)?.closed).toBe(true);
  });

  it('reports a file it cannot read, then recovers', async () => {
    await writeDesign(path, valid);
    await open();
    await rm(path);
    await mkdir(path);
    await expect
      .poll(() => states.at(-1))
      .toMatchObject({
        status: 'read-error',
        readError: expect.stringContaining('EISDIR') as string,
        document: valid,
      });
    await rm(path, { recursive: true });
    await writeDesign(path, renamed);
    await expect
      .poll(() => states.at(-1))
      .toMatchObject({ status: 'ok', readError: null, document: renamed });
  });

  it('redraws when images are added to or changed in the assets folder', async () => {
    const withImage = createDocument();
    for (const artboard of withImage.pages.flatMap((page) => page.artboards)) {
      artboard.children = [{ type: 'image', id: 'hero', src: 'photos/hero.png' }];
    }
    await writeDesign(path, withImage);
    await open();
    expect(states.at(-1)?.diagnostics.map((d) => d.code)).toEqual(['missing-asset']);

    await mkdir(join(dir, 'design.assets', 'photos'), { recursive: true });
    await writeFile(join(dir, 'design.assets', 'photos', 'hero.png'), 'one');
    await expect.poll(() => states.at(-1)?.diagnostics).toEqual([]);
    const version = states.at(-1)?.assetsVersion ?? 0;
    expect(version).toBeGreaterThan(0);

    await writeFile(join(dir, 'design.assets', 'photos', 'hero.png'), 'two');
    await expect.poll(() => states.at(-1)?.assetsVersion).toBeGreaterThan(version);
  });

  it('stops reporting changes once closed', async () => {
    await writeDesign(path, valid);
    await (await open()).close();
    await writeDesign(path, renamed);
    await settle();
    expect(states).toHaveLength(1);
  });
});
