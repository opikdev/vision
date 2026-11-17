import { formatDiagnostic, type Diagnostic, type VisionDocument } from '@vision/format';

export interface ProblemText {
  line: number | null;
  place: string | null;
  message: string;
  hint: string | null;
}

export function describeProblem(diagnostic: Diagnostic, doc: VisionDocument | null): ProblemText {
  return {
    line: diagnostic.line ?? null,
    place: diagnostic.artboardId === undefined ? null : artboardName(doc, diagnostic.artboardId),
    message: diagnostic.message,
    hint: diagnostic.hint ?? null,
  };
}

function artboardName(doc: VisionDocument | null, id: string): string {
  for (const page of doc?.pages ?? []) {
    const artboard = page.artboards.find((candidate) => candidate.id === id);
    if (artboard !== undefined) return artboard.name;
  }
  return id;
}

export function errorsFirst(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [
    ...diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    ...diagnostics.filter((diagnostic) => diagnostic.severity === 'warning'),
  ];
}

export function countProblems(diagnostics: readonly Diagnostic[]): {
  errors: number;
  warnings: number;
} {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  return { errors, warnings: diagnostics.length - errors };
}

export function artboardErrorCounts(diagnostics: readonly Diagnostic[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { severity, artboardId } of diagnostics) {
    if (severity === 'error' && artboardId !== undefined) {
      counts.set(artboardId, (counts.get(artboardId) ?? 0) + 1);
    }
  }
  return counts;
}

export function problemsText(diagnostics: readonly Diagnostic[]): string {
  return errorsFirst(diagnostics).map(formatDiagnostic).join('\n');
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export interface TextPart {
  text: string;
  code: boolean;
}

export function splitCode(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(/`([^`]+)`|"([^"]+)"/g)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), code: false });
    parts.push({ text: match[1] ?? match[2] ?? '', code: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), code: false });
  return parts;
}
