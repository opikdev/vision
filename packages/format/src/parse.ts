import {
  findNodeAtLocation,
  parseTree,
  printParseErrorCode,
  type Node as JsonNode,
  type ParseError,
} from 'jsonc-parser';
import type { $ZodIssue } from 'zod/v4/core';
import { closest } from './closest';
import { hasErrors, type Diagnostic, type JsonPath } from './diagnostics';
import {
  artboardSchema,
  documentSchema,
  frameNodeSchema,
  imageNodeSchema,
  pageSchema,
  svgNodeSchema,
  textNodeSchema,
  tokensSchema,
  type VisionDocument,
} from './schema';
import { validateDocument } from './validate';

export type ParseResult =
  | { ok: true; document: VisionDocument; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };

type StructureResult =
  | { ok: true; document: VisionDocument; locate: (diagnostic: Diagnostic) => Diagnostic }
  | { ok: false; diagnostics: Diagnostic[] };

export function parseDocument(text: string): ParseResult {
  const structure = parseStructure(text);
  if (!structure.ok) return structure;
  const diagnostics = validateDocument(structure.document).map(structure.locate);
  return hasErrors(diagnostics)
    ? { ok: false, diagnostics }
    : { ok: true, document: structure.document, diagnostics };
}

export function parseStructure(input: string): StructureResult {
  const text = input.startsWith('\uFEFF') ? input.slice(1) : input;
  const position = positionFinder(text);
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false });
  const syntaxError = errors[0];
  if (syntaxError !== undefined || tree === undefined) {
    return { ok: false, diagnostics: [syntaxDiagnostic(text, syntaxError, position)] };
  }
  const value = JSON.parse(text) as unknown;
  const locate = (diagnostic: Diagnostic): Diagnostic => ({
    ...diagnostic,
    ...position(offsetOf(tree, diagnostic.path)),
  });
  const parsed = documentSchema.safeParse(value);
  if (parsed.success) return { ok: true, document: parsed.data, locate };
  return {
    ok: false,
    diagnostics: parsed.error.issues
      .flatMap((issue) => schemaDiagnostics(issue, value))
      .map(locate),
  };
}

function positionFinder(text: string): (offset: number) => { line: number; column: number } {
  const lineStarts = [0];
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\n') lineStarts.push(index + 1);
  }
  return (offset) => {
    const line = lineStarts.findLastIndex((start) => start <= offset);
    return { line: line + 1, column: offset - (lineStarts[line] ?? 0) + 1 };
  };
}

const syntaxMessages: Record<string, string> = {
  InvalidSymbol: 'Unexpected character',
  InvalidNumberFormat: 'Invalid number',
  PropertyNameExpected: 'Expected a field name in double quotes',
  ValueExpected: 'Expected a value',
  ColonExpected: 'Expected ":"',
  CommaExpected: 'Expected ","',
  CloseBraceExpected: 'Expected "}"',
  CloseBracketExpected: 'Expected "]"',
  EndOfFileExpected: 'Unexpected content after the end of the document',
  InvalidCommentToken: "Comments aren't allowed in JSON",
  UnexpectedEndOfComment: "Comments aren't allowed in JSON",
  UnexpectedEndOfString: 'Unterminated string',
  UnexpectedEndOfNumber: 'Unterminated number',
  InvalidUnicode: 'Invalid unicode escape',
  InvalidEscapeCharacter: 'Invalid escape character',
  InvalidCharacter: 'Invalid character in a string',
};

function syntaxDiagnostic(
  text: string,
  error: ParseError | undefined,
  position: (offset: number) => { line: number; column: number },
): Diagnostic {
  if (error === undefined) {
    return { severity: 'error', code: 'json-syntax', message: 'The file is empty', path: [] };
  }
  const before = text.slice(0, error.offset).trimEnd();
  if (before.endsWith(',') && /^\s*[}\]]/.test(text.slice(error.offset))) {
    return {
      severity: 'error',
      code: 'json-syntax',
      message: 'Trailing comma',
      hint: 'Remove the comma before the closing bracket.',
      path: [],
      ...position(before.length - 1),
    };
  }
  const name = printParseErrorCode(error.error);
  return {
    severity: 'error',
    code: 'json-syntax',
    message: syntaxMessages[name] ?? name,
    path: [],
    ...position(error.offset),
  };
}

function offsetOf(tree: JsonNode, path: JsonPath): number {
  for (let length = path.length; length >= 0; length--) {
    const node = findNodeAtLocation(tree, path.slice(0, length));
    if (node !== undefined)
      return node.parent?.type === 'property' ? node.parent.offset : node.offset;
  }
  return 0;
}

function schemaDiagnostics(issue: $ZodIssue, root: unknown): Diagnostic[] {
  const path = issue.path.filter((part) => typeof part !== 'symbol');
  const base = { severity: 'error', code: 'schema', path, ...contextIds(root, path) } as const;
  const value = valueAt(root, path);
  const label = labelOf(path);
  switch (issue.code) {
    case 'invalid_type':
      if (value === undefined) {
        return [
          {
            ...base,
            message: `Missing field ${label}`,
            hint: `Add ${label} (${article(issue.expected)}).`,
          },
        ];
      }
      return [
        {
          ...base,
          message: `${capitalize(label)} must be ${article(issue.expected)}, not ${article(typeOf(value))}`,
        },
      ];
    case 'invalid_value':
      return [
        {
          ...base,
          message: `${capitalize(label)} must be ${issue.values.map((v) => JSON.stringify(v)).join(' or ')}`,
        },
      ];
    case 'too_small':
    case 'too_big': {
      const bound = issue.code === 'too_small' ? issue.minimum : issue.maximum;
      const relation = issue.code === 'too_small' ? 'at least' : 'at most';
      const message =
        issue.origin === 'array'
          ? `${capitalize(label)} needs ${relation} ${bound} item${Number(bound) === 1 ? '' : 's'}`
          : `${capitalize(label)} must be ${relation} ${bound}, not ${JSON.stringify(value)}`;
      return [{ ...base, message }];
    }
    case 'unrecognized_keys': {
      const allowed = allowedKeys(path, value);
      return issue.keys.map((key) => {
        const suggestion = closest(key, allowed);
        return {
          ...base,
          path: [...path, key],
          message: `Unknown field ${JSON.stringify(key)}`,
          hint:
            suggestion === undefined
              ? `Remove it. Allowed fields here: ${allowed.join(', ')}.`
              : `Did you mean ${JSON.stringify(suggestion)}?`,
        };
      });
    }
    case 'invalid_union':
      if (issue.discriminator !== undefined) {
        const hint = 'Use "frame", "text", "image" or "svg".';
        return [
          value === undefined
            ? { ...base, message: `Missing field ${label}`, hint }
            : { ...base, message: `Unknown node type ${JSON.stringify(value)}`, hint },
        ];
      }
      return [{ ...base, message: issue.message }];
    case 'invalid_format':
    case 'invalid_key':
    case 'invalid_element':
    case 'not_multiple_of':
    case 'custom':
      return [{ ...base, message: issue.message }];
  }
}

function valueAt(root: unknown, path: JsonPath): unknown {
  let current = root;
  for (const part of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string | number, unknown>)[part];
  }
  return current;
}

function contextIds(
  root: unknown,
  path: JsonPath,
): Pick<Diagnostic, 'pageId' | 'artboardId' | 'nodeId'> {
  const ids: Pick<Diagnostic, 'pageId' | 'artboardId' | 'nodeId'> = {};
  const keys = { pages: 'pageId', artboards: 'artboardId', children: 'nodeId' } as const;
  for (let index = 0; index < path.length - 1; index++) {
    const segment = path[index];
    if (segment !== 'pages' && segment !== 'artboards' && segment !== 'children') continue;
    const id = valueAt(root, [...path.slice(0, index + 2), 'id']);
    if (typeof id === 'string') ids[keys[segment]] = id;
  }
  return ids;
}

const nodeShapes: Record<string, object> = {
  frame: frameNodeSchema.shape,
  text: textNodeSchema.shape,
  image: imageNodeSchema.shape,
  svg: svgNodeSchema.shape,
};

function allowedKeys(path: JsonPath, value: unknown): string[] {
  const parent = path.at(-2);
  const type = valueAt(value, ['type']);
  let shape: object | undefined;
  if (path.length === 0) shape = documentSchema.shape;
  else if (path.length === 1 && path[0] === 'tokens') shape = tokensSchema.shape;
  else if (parent === 'pages') shape = pageSchema.shape;
  else if (parent === 'artboards') shape = artboardSchema.shape;
  else if (parent === 'children' && typeof type === 'string') shape = nodeShapes[type];
  return Object.keys(shape ?? {});
}

function labelOf(path: JsonPath): string {
  const last = path.at(-1);
  if (last === undefined) return 'the document';
  if (typeof last === 'number') return `item ${last} of ${JSON.stringify(path.at(-2))}`;
  return JSON.stringify(last);
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function article(type: string): string {
  if (type === 'null') return 'null';
  return /^[aeiou]/.test(type) ? `an ${type}` : `a ${type}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
