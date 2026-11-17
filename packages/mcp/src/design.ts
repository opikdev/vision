import { stat } from 'node:fs/promises';
import { formatDiagnostic, type Diagnostic, type VisionDocument } from '@vision/format';
import { assetDiagnostics, readDesign } from '@vision/format/node';
import { tailwind } from './tailwind';

export interface Inspection {
  exists: boolean;
  document: VisionDocument | undefined;
  diagnostics: Diagnostic[];
}

export async function inspectDesign(file: string): Promise<Inspection> {
  const { exists, result } = await readDesign(file);
  if (!result.ok) return { exists, document: undefined, diagnostics: result.diagnostics };
  const checks = await fileChecks(file, result.document);
  return { exists, document: result.document, diagnostics: [...result.diagnostics, ...checks] };
}

export async function fileChecks(file: string, document: VisionDocument): Promise<Diagnostic[]> {
  const [assets, classes] = await Promise.all([
    assetDiagnostics(file, document),
    tailwind.classDiagnostics(document),
  ]);
  return [...assets, ...classes];
}

export function describeProblems(diagnostics: Diagnostic[]): string {
  if (diagnostics.length === 0) return 'No problems.';
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning');
  return `${problemCounts(diagnostics)}:\n${listDiagnostics([...errors, ...warnings])}`;
}

export function problemCounts(diagnostics: Diagnostic[]): string {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  return `${plural(errors, 'error')}, ${plural(diagnostics.length - errors, 'warning')}`;
}

export function listDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics.map((diagnostic) => `- ${formatDiagnostic(diagnostic)}`).join('\n');
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function missingText(file: string): string {
  return `${file} doesn't exist yet. The first edit creates it with page "page-1" and a 1440x900 artboard "desktop".`;
}

export function invalidText(file: string, diagnostics: Diagnostic[]): string {
  return `${file} has errors, so it can't be read until they're fixed:\n${listDiagnostics(diagnostics)}`;
}

export async function fileExists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}
