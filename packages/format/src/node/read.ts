import { open, type FileHandle } from 'node:fs/promises';
import { basename } from 'node:path';
import { createDocument } from '../create';
import type { Diagnostic } from '../diagnostics';
import { parseDocument, type ParseResult } from '../parse';

const megabyte = 1024 * 1024;
const maxDesignBytes = 20 * megabyte;

export interface FileVersion {
  mtimeMs: number;
  size: number;
}

export type DesignFile =
  | { kind: 'missing' }
  | { kind: 'too-large'; diagnostic: Diagnostic }
  | { kind: 'text'; text: string; version: FileVersion; mode: number };

export async function readDesign(
  path: string,
): Promise<{ text: string; result: ParseResult; exists: boolean }> {
  const file = await readDesignFile(path);
  switch (file.kind) {
    case 'missing':
      return {
        text: '',
        result: { ok: true, document: createDocument(), diagnostics: [] },
        exists: false,
      };
    case 'too-large':
      return { text: '', result: { ok: false, diagnostics: [file.diagnostic] }, exists: true };
    case 'text':
      return { text: file.text, result: parseDocument(file.text), exists: true };
  }
}

export async function readDesignFile(path: string): Promise<DesignFile> {
  let file: FileHandle;
  try {
    file = await open(path, 'r');
  } catch (error) {
    if (isMissingFileError(error)) return { kind: 'missing' };
    throw error;
  }
  try {
    const { size, mtimeMs, mode } = await file.stat();
    if (size > maxDesignBytes) return { kind: 'too-large', diagnostic: tooLarge(path, size) };
    const text = await file.readFile('utf8');
    return { kind: 'text', text, version: { mtimeMs, size }, mode: mode & 0o7777 };
  } finally {
    await file.close();
  }
}

function tooLarge(path: string, size: number): Diagnostic {
  return {
    severity: 'error',
    code: 'file-too-large',
    message: `${basename(path)} is ${Math.ceil(size / megabyte)} MB; Vision opens files up to ${maxDesignBytes / megabyte} MB`,
    path: [],
  };
}

export function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  );
}
