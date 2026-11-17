import { maxNodes, type Activity } from '@vision/activity';
import { diffDocuments, type Artboard, type VisionDocument } from '@vision/format';
import { plural } from '../design';

export type EditActivity = Extract<Activity, { kind: 'edit' }>;
export type LookActivity = Extract<Activity, { kind: 'look' }>;

export function describeReading(): LookActivity {
  return { kind: 'look', summary: 'is reading the design' };
}

export function describeScreenshot(artboard: Artboard): LookActivity {
  return {
    kind: 'look',
    artboard: artboard.id,
    summary: `is taking a screenshot of ${artboard.name}`,
  };
}

export function describeReview(artboard: Artboard | undefined): LookActivity {
  return artboard === undefined
    ? { kind: 'look', summary: 'is reviewing the design' }
    : { kind: 'look', artboard: artboard.id, summary: `is reviewing ${artboard.name}` };
}

export function describeEdit(before: VisionDocument, after: VisionDocument): EditActivity {
  const { touched, removed } = diffDocuments(before, after);
  const nodes = touched.flatMap(({ change, located }) =>
    located.kind === 'node' ? [{ change, id: located.node.id, artboard: located.artboard }] : [],
  );
  const first = nodes[0];
  if (first !== undefined) {
    const added = nodes.filter(({ change }) => change === 'added').length;
    return {
      kind: 'edit',
      artboard: first.artboard.id,
      nodes: nodes.slice(0, maxNodes).map(({ id }) => id),
      summary:
        added > 0
          ? `is adding ${plural(added, 'element')} to ${first.artboard.name}`
          : `is editing ${plural(nodes.length, 'element')} in ${first.artboard.name}`,
    };
  }
  for (const { change, located } of touched) {
    if (located.kind !== 'artboard') continue;
    const verb = change === 'added' ? 'adding' : 'editing';
    return edit(`is ${verb} the artboard ${located.artboard.name}`, located.artboard);
  }
  for (const located of removed) {
    if (located.kind === 'page') return edit(`is removing the page ${located.page.name}`);
  }
  for (const located of removed) {
    if (located.kind === 'artboard')
      return edit(`is removing the artboard ${located.artboard.name}`);
  }
  const removedNodes = removed.filter((located) => located.kind === 'node');
  const firstRemoved = removedNodes[0];
  if (firstRemoved !== undefined) {
    const { artboard, parent } = firstRemoved;
    const summary = `is removing ${plural(removedNodes.length, 'element')} from ${artboard.name}`;
    return parent === artboard ? edit(summary, artboard) : edit(summary, artboard, [parent.id]);
  }
  for (const { change, located } of touched) {
    if (located.kind !== 'page') continue;
    const verb = change === 'added' ? 'adding' : 'renaming';
    return edit(`is ${verb} the page ${located.page.name}`);
  }
  if (JSON.stringify(before.tokens ?? {}) !== JSON.stringify(after.tokens ?? {})) {
    return edit('is updating tokens');
  }
  return edit('is editing the design');
}

function edit(summary: string, artboard?: Artboard, nodes: string[] = []): EditActivity {
  return artboard === undefined
    ? { kind: 'edit', nodes, summary }
    : { kind: 'edit', artboard: artboard.id, nodes, summary };
}
