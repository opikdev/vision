import type { CallToolResult } from '@modelcontextprotocol/server';
import { EditError, validateDocument, type Diagnostic, type VisionDocument } from '@vision/format';
import { editDesign } from '@vision/format/node';
import { fileChecks, fileExists, listDiagnostics } from './design';
import { errorResult, textResult } from './results';

export interface EditOutcome {
  document: VisionDocument;
  summary: string;
  structured?: Record<string, unknown>;
}

interface Applied {
  before: VisionDocument;
  outcome: EditOutcome;
}

export async function runEdit(
  file: string,
  change: (document: VisionDocument) => EditOutcome,
): Promise<CallToolResult> {
  const existed = await fileExists(file);
  let applied = undefined as Applied | undefined;
  try {
    await editDesign(file, (before) => {
      const outcome = change(before);
      applied = { before, outcome };
      return outcome.document;
    });
  } catch (error) {
    if (error instanceof EditError) return errorResult(error.message);
    throw error;
  }
  if (applied === undefined) throw new Error(`The edit of ${file} finished without running`);
  const { before, outcome } = applied;
  const lines = [
    ...(existed ? [] : [`Created ${file} with page "page-1" and artboard "desktop".`]),
    outcome.summary,
    ...(await newWarnings(file, before, outcome.document)),
  ];
  return textResult(lines.join('\n'), outcome.structured);
}

async function newWarnings(
  file: string,
  before: VisionDocument,
  after: VisionDocument,
): Promise<string[]> {
  try {
    const added = introduced(await warnings(file, before), await warnings(file, after));
    return added.length === 0 ? [] : ['', `New warnings:\n${listDiagnostics(added)}`];
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return ['', `The edit was saved, but checking it for new warnings failed: ${reason}`];
  }
}

async function warnings(file: string, document: VisionDocument): Promise<Diagnostic[]> {
  const all = [...validateDocument(document), ...(await fileChecks(file, document))];
  return all.filter((diagnostic) => diagnostic.severity === 'warning');
}

function introduced(before: Diagnostic[], after: Diagnostic[]): Diagnostic[] {
  const counts = new Map<string, number>();
  for (const diagnostic of before) {
    const key = keyOf(diagnostic);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return after.filter((diagnostic) => {
    const key = keyOf(diagnostic);
    const remaining = counts.get(key) ?? 0;
    counts.set(key, remaining - 1);
    return remaining <= 0;
  });
}

function keyOf(diagnostic: Diagnostic): string {
  const where = diagnostic.nodeId ?? diagnostic.artboardId ?? diagnostic.pageId ?? '';
  return `${diagnostic.code}\u0000${diagnostic.message}\u0000${where}`;
}
