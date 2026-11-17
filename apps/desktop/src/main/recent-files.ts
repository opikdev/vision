import { isMissingFileError } from '@vision/format/node';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { z } from 'zod';
import type { RecentFile } from '../shared/contract';

const storeSchema = z.object({ version: z.literal(1), paths: z.array(z.string()) });

export class RecentFiles {
  readonly #file: string;
  readonly #limit: number;
  #paths: Promise<string[]> | undefined;
  #writes: Promise<void> = Promise.resolve();

  constructor(file: string, limit = 10) {
    this.#file = file;
    this.#limit = limit;
  }

  async list(): Promise<RecentFile[]> {
    const paths = await this.#load();
    return Promise.all(
      paths.map(async (path) => ({ path, name: basename(path), exists: await isFile(path) })),
    );
  }

  add(path: string): Promise<void> {
    return this.#update((paths) =>
      [path, ...paths.filter((existing) => existing !== path)].slice(0, this.#limit),
    );
  }

  remove(path: string): Promise<void> {
    return this.#update((paths) => paths.filter((existing) => existing !== path));
  }

  #load(): Promise<string[]> {
    if (this.#paths === undefined) {
      const loading = readStore(this.#file);
      this.#paths = loading;
      loading.catch(() => {
        if (this.#paths === loading) this.#paths = undefined;
      });
    }
    return this.#paths;
  }

  #update(change: (paths: string[]) => string[]): Promise<void> {
    const write = this.#writes.then(async () => {
      const paths = change(await this.#load());
      this.#paths = Promise.resolve(paths);
      await writeStore(this.#file, paths);
    });
    this.#writes = write.catch(() => undefined);
    return write;
  }
}

async function readStore(file: string): Promise<string[]> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) return [];
    throw error;
  }
  const parsed = storeSchema.safeParse(parseJson(text));
  if (!parsed.success) {
    console.warn(`Ignoring unreadable recent files list at ${file}`);
    return [];
  }
  return parsed.data.paths;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function writeStore(file: string, paths: string[]): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await writeFile(temp, `${JSON.stringify({ version: 1, paths }, null, 2)}\n`);
  await rename(temp, file);
}

function isFile(path: string): Promise<boolean> {
  return stat(path).then(
    (stats) => stats.isFile(),
    () => false,
  );
}
