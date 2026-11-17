import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { EditError } from '../edit/error';
import type { VisionDocument } from '../schema';
import { serializeDocument } from '../serialize';
import { isMissingFileError, type FileVersion } from './read';

export interface WriteOptions {
  mode?: number;
  unchangedSince?: FileVersion | 'missing';
}

export async function writeDesign(
  path: string,
  doc: VisionDocument,
  options: WriteOptions = {},
): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const temp = join(dir, `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    const file = await open(temp, 'wx');
    try {
      await file.writeFile(serializeDocument(doc), 'utf8');
      if (options.mode !== undefined) await file.chmod(options.mode);
      await file.sync();
    } finally {
      await file.close();
    }
    if (options.unchangedSince !== undefined) await assertUnchanged(path, options.unchangedSince);
    await rename(temp, path);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

async function assertUnchanged(path: string, expected: FileVersion | 'missing'): Promise<void> {
  const current = await versionOf(path);
  const unchanged =
    expected === 'missing' || current === 'missing'
      ? expected === current
      : expected.mtimeMs === current.mtimeMs && expected.size === current.size;
  if (!unchanged) {
    throw new EditError(
      `${basename(path)} changed while this edit was being applied. Read it again and retry.`,
    );
  }
}

async function versionOf(path: string): Promise<FileVersion | 'missing'> {
  try {
    const { mtimeMs, size } = await stat(path);
    return { mtimeMs, size };
  } catch (error) {
    if (isMissingFileError(error)) return 'missing';
    throw error;
  }
}
