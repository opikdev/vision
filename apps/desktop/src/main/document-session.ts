import { assetDiagnostics, readDesign } from '@vision/format/node';
import type { VisionDocument } from '@vision/format';
import { watch } from 'chokidar';
import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, sep } from 'node:path';
import type { DocumentState } from '../shared/contract';
import { isMissingFileError } from './errors';
import { sanitizeDocument } from './sanitize-document';

export interface DocumentSessionOptions {
  path: string;
  assetToken: string;
  onChange: (state: DocumentState) => void;
  debounceMs?: number;
}

export interface DocumentSession {
  readonly path: string;
  state(): DocumentState;
  close(): Promise<void>;
}

type Snapshot = Pick<DocumentState, 'status' | 'document' | 'diagnostics' | 'mtimeMs'> & {
  text: string;
};

export async function openDocumentSession(
  options: DocumentSessionOptions,
): Promise<DocumentSession> {
  const { path, assetToken, onChange, debounceMs = 75 } = options;
  const dir = dirname(path);
  const name = basename(path);
  let lastValid: VisionDocument | null = null;
  let key = '';
  let closed = false;
  let timer: NodeJS.Timeout | undefined;
  let queue = Promise.resolve();
  let current: DocumentState = {
    revision: 0,
    path,
    displayPath: tildify(path),
    name,
    status: 'missing',
    document: null,
    diagnostics: [],
    mtimeMs: null,
    assetToken,
  };

  const refresh = async (): Promise<void> => {
    const snapshot = await readSnapshot(path, lastValid);
    if (snapshot.status === 'ok') lastValid = snapshot.document;
    const nextKey = JSON.stringify([snapshot.status, snapshot.text, snapshot.diagnostics]);
    if (closed || nextKey === key) return;
    key = nextKey;
    current = {
      ...current,
      revision: current.revision + 1,
      status: snapshot.status,
      document: snapshot.document,
      diagnostics: snapshot.diagnostics,
      mtimeMs: snapshot.mtimeMs,
    };
    onChange(current);
  };

  const schedule = (): void => {
    queue = queue.then(refresh).catch((error: unknown) => {
      console.error(`Couldn't read ${path}:`, error);
    });
  };

  const watcher = watch(dir, {
    depth: 0,
    ignoreInitial: true,
    atomic: true,
    ignored: (candidate) => candidate !== dir && basename(candidate) !== name,
  });
  watcher.on('all', (_event, changed) => {
    if (changed !== path && !changed.endsWith(`${sep}${name}`)) return;
    clearTimeout(timer);
    timer = setTimeout(schedule, debounceMs);
  });
  watcher.on('error', (error) => {
    console.error(`Watching ${dir} failed:`, error);
  });
  await new Promise<void>((resolve) =>
    watcher.once('ready', () => {
      resolve();
    }),
  );
  await refresh();

  return {
    path,
    state: () => current,
    async close() {
      closed = true;
      clearTimeout(timer);
      await watcher.close();
    },
  };
}

async function readSnapshot(path: string, lastValid: VisionDocument | null): Promise<Snapshot> {
  const missing: Snapshot = {
    status: 'missing',
    text: '',
    document: lastValid,
    diagnostics: [],
    mtimeMs: null,
  };
  const { text, result, exists } = await readDesign(path);
  if (!exists) return missing;
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(path)).mtimeMs;
  } catch (error) {
    if (isMissingFileError(error)) return missing;
    throw error;
  }
  if (!result.ok) {
    return {
      status: 'invalid',
      text,
      document: lastValid,
      diagnostics: result.diagnostics,
      mtimeMs,
    };
  }
  const sanitized = sanitizeDocument(result.document);
  const assets = await assetDiagnostics(path, result.document);
  return {
    status: 'ok',
    text,
    document: sanitized.document,
    diagnostics: [...result.diagnostics, ...sanitized.diagnostics, ...assets],
    mtimeMs,
  };
}

function tildify(path: string): string {
  const home = homedir();
  return path.startsWith(`${home}${sep}`) ? `~${path.slice(home.length)}` : path;
}
