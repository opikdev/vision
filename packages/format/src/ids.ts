import { collectIds } from './query';
import type { VisionDocument } from './schema';

export const idPattern = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;

export function idProblem(id: string): string | undefined {
  return idPattern.test(id)
    ? undefined
    : 'Ids may only contain letters, digits, "-" and "_", and can\'t start with "-", such as "pay-button".';
}

export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  for (let number = 1; ; number++) {
    const id = `${slug}-${number}`;
    if (!taken.has(id)) return id;
  }
}

export function generateId(doc: VisionDocument, base: string): string {
  return uniqueId(base, collectIds(doc));
}
