export type Severity = 'error' | 'warning';

export type DiagnosticCode =
  | 'json-syntax'
  | 'file-too-large'
  | 'schema'
  | 'duplicate-id'
  | 'invalid-id'
  | 'invalid-token'
  | 'asset-path'
  | 'unknown-class'
  | 'missing-asset'
  | 'invalid-svg'
  | 'artboard-overlap';

export type JsonPath = (string | number)[];

export interface Diagnostic {
  severity: Severity;
  code: DiagnosticCode;
  message: string;
  hint?: string;
  path: JsonPath;
  line?: number;
  column?: number;
  pageId?: string;
  artboardId?: string;
  nodeId?: string;
}

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const where =
    diagnostic.line === undefined
      ? formatPath(diagnostic.path)
      : `line ${diagnostic.line}, ${formatPath(diagnostic.path)}`;
  const hint = diagnostic.hint === undefined ? '' : ` ${diagnostic.hint}`;
  return `${diagnostic.severity} ${diagnostic.code} at ${where}: ${diagnostic.message}.${hint}`;
}

export function formatPath(path: JsonPath): string {
  if (path.length === 0) return '(document)';
  return path
    .map((part, index) => {
      if (typeof part === 'number') return `[${part}]`;
      return index === 0 ? part : `.${part}`;
    })
    .join('');
}
