import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type { VisionDocument } from '../schema';
import { serializeDocument } from '../serialize';

export async function writeDesign(path: string, doc: VisionDocument): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const temp = join(dir, `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    const file = await open(temp, 'wx');
    try {
      await file.writeFile(serializeDocument(doc), 'utf8');
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temp, path);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}
