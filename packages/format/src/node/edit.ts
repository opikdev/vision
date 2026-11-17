import { resolve } from 'node:path';
import { createDocument } from '../create';
import { formatDiagnostic, type Diagnostic } from '../diagnostics';
import { EditError } from '../edit/error';
import { parseDocument, parseStructure } from '../parse';
import type { VisionDocument } from '../schema';
import { serializeDocument } from '../serialize';
import { validateDocument } from '../validate';
import { readDesignFile } from './read';
import { writeDesign } from './write';

const queues = new Map<string, Promise<unknown>>();

export function editDesign(
  path: string,
  edit: (doc: VisionDocument) => VisionDocument,
): Promise<{ document: VisionDocument; diagnostics: Diagnostic[] }> {
  const key = resolve(path);
  const run = (queues.get(key) ?? Promise.resolve()).then(() => applyEdit(key, edit));
  // The queue only orders edits; each caller still receives its own result or error from `run`.
  queues.set(
    key,
    run.catch(() => undefined),
  );
  return run;
}

async function applyEdit(
  path: string,
  edit: (doc: VisionDocument) => VisionDocument,
): Promise<{ document: VisionDocument; diagnostics: Diagnostic[] }> {
  const file = await readDesignFile(path);
  if (file.kind === 'too-large') {
    throw new EditError(`${path} can't be edited: ${formatDiagnostic(file.diagnostic)}`);
  }
  let current = createDocument();
  if (file.kind === 'text') {
    const structure = parseStructure(file.text);
    if (!structure.ok) {
      throw new EditError(
        `${path} can't be edited until these problems are fixed by hand:\n${list(structure.diagnostics)}`,
      );
    }
    current = structure.document;
  }
  const before = errorCounts(validateDocument(current));
  const document = edit(current);
  const result = parseDocument(serializeDocument(document));
  const added = result.diagnostics.filter((diagnostic) => {
    if (diagnostic.severity !== 'error') return false;
    const key = errorKey(diagnostic);
    const remaining = before.get(key) ?? 0;
    before.set(key, remaining - 1);
    return remaining <= 0;
  });
  if (added.length > 0) {
    throw new EditError(
      `The edit was rejected because it adds errors:\n${list(added.map(withoutPosition))}`,
    );
  }
  await writeDesign(path, document);
  return { document, diagnostics: result.diagnostics };
}

function errorCounts(diagnostics: Diagnostic[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity !== 'error') continue;
    const key = errorKey(diagnostic);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function errorKey(diagnostic: Diagnostic): string {
  return `${diagnostic.code}\u0000${diagnostic.message}`;
}

function withoutPosition(diagnostic: Diagnostic): Diagnostic {
  const copy = { ...diagnostic };
  delete copy.line;
  delete copy.column;
  return copy;
}

function list(diagnostics: Diagnostic[]): string {
  return diagnostics.map((diagnostic) => `- ${formatDiagnostic(diagnostic)}`).join('\n');
}
