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

  async add(path: string): Promise<void> {
    const paths = await this.#load();
    await this.#save(
      [path, ...paths.filter((existing) => existing !== path)].slice(0, this.#limit),
    );
  }

  async remove(path: string): Promise<void> {
    const paths = await this.#load();
    await this.#save(paths.filter((existing) => existing !== path));
  }

  #load(): Promise<string[]> {
    this.#paths ??= readStore(this.#file);
    return this.#paths;
  }

  #save(paths: string[]): Promise<void> {
    this.#paths = Promise.resolve(paths);
    const write = this.#writes.then(() => writeStore(this.#file, paths));
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

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (isMissingFileError(error)) return false;
    throw error;
  }
}
