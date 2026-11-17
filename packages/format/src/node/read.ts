import { readFile } from 'node:fs/promises';
import { createDocument } from '../create';
import { parseDocument, type ParseResult } from '../parse';

export async function readDesign(
  path: string,
): Promise<{ text: string; result: ParseResult; exists: boolean }> {
  const text = await readTextIfExists(path);
  if (text === undefined) {
    return {
      text: '',
      result: { ok: true, document: createDocument(), diagnostics: [] },
      exists: false,
    };
  }
  return { text, result: parseDocument(text), exists: true };
}

export async function readTextIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

export function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  );
}
