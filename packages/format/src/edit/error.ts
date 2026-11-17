import { closest } from '../closest';
import { idProblem } from '../ids';
import { collectIds, findById, type Container, type Located } from '../query';
import type { VisionDocument } from '../schema';

export class EditError extends Error {
  override name = 'EditError';
}

export function locate(doc: VisionDocument, id: string): Located {
  const located = findById(doc, id);
  if (located !== undefined) return located;
  const suggestion = closest(id, collectIds(doc));
  const hint = suggestion === undefined ? '' : ` Did you mean "${suggestion}"?`;
  throw new EditError(`No page, artboard or node has id "${id}".${hint}`);
}

export function containerOf(located: Located, role: string): Container {
  if (located.kind === 'artboard') return located.artboard;
  if (located.kind === 'node' && located.node.type === 'frame') return located.node;
  const what = located.kind === 'node' ? `a ${located.node.type} node` : 'a page';
  throw new EditError(
    `The ${role} "${idOfLocated(located)}" is ${what}. Use an artboard or frame id.`,
  );
}

export function assertNewId(doc: VisionDocument, id: string): void {
  const problem = idProblem(id);
  if (problem !== undefined) throw new EditError(`Invalid id "${id}". ${problem}`);
  if (collectIds(doc).has(id)) {
    throw new EditError(`The id "${id}" is already used. Choose another id or leave it out.`);
  }
}

export function assertSize(field: string, value: number): void {
  if (!Number.isFinite(value) || value < 1 || value > 10000) {
    throw new EditError(`${field} must be a number from 1 to 10000, not ${value}.`);
  }
}

export function assertCoordinate(field: string, value: number): void {
  if (!Number.isFinite(value))
    throw new EditError(`${field} must be a finite number, not ${value}.`);
}

function idOfLocated(located: Located): string {
  return located.kind === 'node' ? located.node.id : located.page.id;
}
