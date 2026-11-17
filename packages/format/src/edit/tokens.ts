import { tokenGroups, type TokenGroup, type VisionDocument } from '../schema';
import { tokenNameProblem, tokenValueProblem } from '../tokens';
import { EditError } from './error';

export type TokensPatch = Partial<Record<TokenGroup, Record<string, string | null>>>;

export function setTokens(doc: VisionDocument, patch: TokensPatch): VisionDocument {
  const groups = new Map(Object.entries(doc.tokens ?? {}));
  for (const [group, entries] of Object.entries(patch)) {
    if (!isTokenGroup(group)) {
      throw new EditError(`Unknown token group "${group}". Use ${tokenGroups.join(', ')}.`);
    }
    const values = new Map(Object.entries(groups.get(group) ?? {}));
    for (const [name, value] of Object.entries(entries)) {
      if (value === null) {
        values.delete(name);
        continue;
      }
      const problem = tokenNameProblem(name) ?? tokenValueProblem(group, value);
      if (problem !== undefined) {
        throw new EditError(`Invalid token ${group}.${name}: ${JSON.stringify(value)}. ${problem}`);
      }
      values.set(name, value);
    }
    if (values.size === 0) groups.delete(group);
    else groups.set(group, Object.fromEntries(values));
  }
  const document: VisionDocument = { ...doc, tokens: Object.fromEntries(groups) };
  if (groups.size === 0) delete document.tokens;
  return document;
}

function isTokenGroup(group: string): group is TokenGroup {
  return (tokenGroups as readonly string[]).includes(group);
}
