import { createDocument, type Diagnostic } from '@vision/format';
import { describe, expect, it } from 'vitest';
import {
  artboardErrorCounts,
  countProblems,
  describeProblem,
  errorsFirst,
  plural,
  problemsText,
  splitCode,
} from './problems';

const unknownClass: Diagnostic = {
  severity: 'warning',
  code: 'unknown-class',
  message: 'Unknown class "text-fg-mutd"',
  hint: 'Did you mean `text-fg-muted`?',
  path: ['pages', 0, 'artboards', 0, 'class'],
  pageId: 'page-1',
  artboardId: 'desktop',
};

const unknownField: Diagnostic = {
  severity: 'error',
  code: 'schema',
  message: 'Unknown field "clas"',
  hint: 'Did you mean "class"?',
  path: ['pages', 0, 'artboards', 0, 'clas'],
  line: 214,
  column: 11,
  pageId: 'page-1',
  artboardId: 'desktop',
};

const syntax: Diagnostic = {
  severity: 'error',
  code: 'json-syntax',
  message: 'Expected ","',
  path: [],
  line: 3,
  column: 1,
};

describe('describeProblem', () => {
  it('names the line and the artboard from the shown document', () => {
    expect(describeProblem(unknownField, createDocument())).toEqual({
      line: 214,
      place: 'Desktop',
      message: 'Unknown field "clas"',
      hint: 'Did you mean "class"?',
    });
  });

  it('falls back to the artboard id and leaves out what is unknown', () => {
    expect(describeProblem(unknownClass, null)).toEqual({
      line: null,
      place: 'desktop',
      message: 'Unknown class "text-fg-mutd"',
      hint: 'Did you mean `text-fg-muted`?',
    });
    expect(describeProblem(syntax, null)).toEqual({
      line: 3,
      place: null,
      message: 'Expected ","',
      hint: null,
    });
  });
});

describe('counting', () => {
  it('puts errors before warnings and counts each', () => {
    expect(errorsFirst([unknownClass, unknownField, syntax])).toEqual([
      unknownField,
      syntax,
      unknownClass,
    ]);
    expect(countProblems([unknownClass, unknownField, syntax])).toEqual({ errors: 2, warnings: 1 });
  });

  it('counts errors per artboard', () => {
    expect([...artboardErrorCounts([unknownClass, unknownField, syntax, unknownField])]).toEqual([
      ['desktop', 2],
    ]);
  });

  it('pluralizes nouns', () => {
    expect([plural(1, 'error'), plural(2, 'warning'), plural(0, 'error')]).toEqual([
      '1 error',
      '2 warnings',
      '0 errors',
    ]);
  });
});

describe('problemsText', () => {
  it('formats every problem on its own line, errors first', () => {
    expect(problemsText([unknownClass, syntax])).toBe(
      'error json-syntax at line 3, (document): Expected ",".\n' +
        'warning unknown-class at pages[0].artboards[0].class: Unknown class "text-fg-mutd". Did you mean `text-fg-muted`?',
    );
  });
});

describe('splitCode', () => {
  it('marks quoted and backticked values as code', () => {
    expect(splitCode('Unknown class "a-b". Did you mean `a-c`?')).toEqual([
      { text: 'Unknown class ', code: false },
      { text: 'a-b', code: true },
      { text: '. Did you mean ', code: false },
      { text: 'a-c', code: true },
      { text: '?', code: false },
    ]);
  });

  it('returns plain text unchanged', () => {
    expect(splitCode('The file is empty')).toEqual([{ text: 'The file is empty', code: false }]);
  });
});
