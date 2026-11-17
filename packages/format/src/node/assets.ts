import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Diagnostic } from '../diagnostics';
import { visit } from '../query';
import type { VisionDocument } from '../schema';
import { isRemoteSrc, locationIds, srcProblem } from '../validate';
import { assetsDirFor } from './paths';
import { isNotFound } from './read';

export async function assetDiagnostics(path: string, doc: VisionDocument): Promise<Diagnostic[]> {
  const assetsDir = assetsDirFor(path);
  const checks = Array.from(visit(doc)).map(async (located): Promise<Diagnostic[]> => {
    if (located.kind !== 'node' || located.node.type !== 'image') return [];
    const { src } = located.node;
    if (isRemoteSrc(src) || srcProblem(src) !== undefined) return [];
    const file = join(assetsDir, src);
    if (await exists(file)) return [];
    return [
      {
        severity: 'warning',
        code: 'missing-asset',
        message: `Image file "${src}" doesn't exist`,
        hint: `Add the file at ${file}, or change src.`,
        path: [...located.path, 'src'],
        ...locationIds(located),
      },
    ];
  });
  return (await Promise.all(checks)).flat();
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}
