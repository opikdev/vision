import type { Diagnostic } from './diagnostics';
import { idProblem } from './ids';
import { idOf, visit, type Located } from './query';
import type { Artboard, Page, VisionDocument } from './schema';
import { tokenEntries, tokenNameProblem, tokenValueProblem } from './tokens';

const artboardGap = 80;

export function validateDocument(doc: VisionDocument): Diagnostic[] {
  return [
    ...idDiagnostics(doc),
    ...tokenDiagnostics(doc),
    ...srcDiagnostics(doc),
    ...overlapDiagnostics(doc),
  ];
}

export function locationIds(
  located: Located,
): Pick<Diagnostic, 'pageId' | 'artboardId' | 'nodeId'> {
  switch (located.kind) {
    case 'page':
      return { pageId: located.page.id };
    case 'artboard':
      return { pageId: located.page.id, artboardId: located.artboard.id };
    case 'node':
      return {
        pageId: located.page.id,
        artboardId: located.artboard.id,
        nodeId: located.node.id,
      };
  }
}

function idDiagnostics(doc: VisionDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const firstUse = new Map<string, Located>();
  for (const located of visit(doc)) {
    const id = idOf(located);
    const path = [...located.path, 'id'];
    const hint = idProblem(id);
    if (hint !== undefined) {
      diagnostics.push({
        severity: 'error',
        code: 'invalid-id',
        message: `Invalid id ${JSON.stringify(id)}`,
        hint,
        path,
        ...locationIds(located),
      });
    }
    const first = firstUse.get(id);
    if (first === undefined) {
      firstUse.set(id, located);
      continue;
    }
    diagnostics.push({
      severity: 'error',
      code: 'duplicate-id',
      message: `Duplicate id ${JSON.stringify(id)}, already used by the ${first.kind} at ${first.path.join('.')}`,
      hint: 'Ids are unique across pages, artboards and nodes. Rename one of them.',
      path,
      ...locationIds(located),
    });
  }
  return diagnostics;
}

function tokenDiagnostics(doc: VisionDocument): Diagnostic[] {
  return tokenEntries(doc.tokens).flatMap(([group, name, value]): Diagnostic[] => {
    const path = ['tokens', group, name];
    const nameHint = tokenNameProblem(name);
    if (nameHint !== undefined) {
      return [
        {
          severity: 'error',
          code: 'invalid-token',
          message: `Invalid token name ${JSON.stringify(name)} in ${group}`,
          hint: nameHint,
          path,
        },
      ];
    }
    const valueHint = tokenValueProblem(group, value);
    if (valueHint === undefined) return [];
    return [
      {
        severity: 'error',
        code: 'invalid-token',
        message: `Invalid value ${JSON.stringify(value)} for token ${group}.${name}`,
        hint: valueHint,
        path,
      },
    ];
  });
}

export function isRemoteSrc(src: string): boolean {
  return src.startsWith('https:');
}

const maxSegmentLength = 255;

export function srcProblem(src: string): string | undefined {
  if (/\p{Cc}/u.test(src)) return 'Remove the control characters from src.';
  if (isRemoteSrc(src)) {
    return URL.canParse(src) ? undefined : "Fix the URL; it can't be parsed.";
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(src)) {
    return 'Use a path inside the assets folder, such as "photos/hero.jpg", or an https: URL.';
  }
  if (src.trim() === '')
    return 'Set src to a path inside the assets folder, such as "photos/hero.jpg".';
  if (/^[/\\]/.test(src)) {
    return 'Use a path relative to the assets folder, such as "photos/hero.jpg", not an absolute path.';
  }
  if (src.split(/[/\\]/).includes('..')) {
    return 'Paths can\'t leave the assets folder; remove ".." and use a path such as "photos/hero.jpg".';
  }
  if (src.split(/[/\\]/).some((segment) => segment.length > maxSegmentLength)) {
    return `Folder and file names in src can be at most ${maxSegmentLength} characters.`;
  }
  return undefined;
}

function srcDiagnostics(doc: VisionDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const located of visit(doc)) {
    if (located.kind !== 'node' || located.node.type !== 'image') continue;
    const hint = srcProblem(located.node.src);
    if (hint === undefined) continue;
    diagnostics.push({
      severity: 'error',
      code: 'asset-path',
      message: `Image src ${JSON.stringify(located.node.src)} is not inside the assets folder or an https: URL`,
      hint,
      path: [...located.path, 'src'],
      ...locationIds(located),
    });
  }
  return diagnostics;
}

function overlaps(a: Artboard, b: Artboard): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function nextArtboardX(page: Page): number {
  if (page.artboards.length === 0) return 0;
  return Math.max(...page.artboards.map((artboard) => artboard.x + artboard.width)) + artboardGap;
}

function overlapDiagnostics(doc: VisionDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const [pageIndex, page] of doc.pages.entries()) {
    for (const [index, artboard] of page.artboards.entries()) {
      const other = page.artboards.slice(0, index).find((earlier) => overlaps(earlier, artboard));
      if (other === undefined) continue;
      diagnostics.push({
        severity: 'warning',
        code: 'artboard-overlap',
        message: `Artboard ${JSON.stringify(artboard.name)} overlaps ${JSON.stringify(other.name)}`,
        hint: `Move it to a free spot, such as x: ${nextArtboardX(page)}, y: ${artboard.y}.`,
        path: ['pages', pageIndex, 'artboards', index],
        pageId: page.id,
        artboardId: artboard.id,
      });
    }
  }
  return diagnostics;
}
