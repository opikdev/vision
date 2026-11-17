import type { McpServer } from '@modelcontextprotocol/server';
import { askSelection, socketPath, type SelectionAnswer } from '@vision/activity/node';
import {
  findById,
  layerLabel,
  type Artboard,
  type Node,
  type Page,
  type VisionDocument,
} from '@vision/format';
import { readDesign } from '@vision/format/node';
import { z } from 'zod';
import type { ToolActivity } from '../activity/tool-activity';
import { invalidText, plural } from '../design';
import { errorResult, textResult } from '../results';
import { file } from '../schemas';

const maxChildren = 20;

export function registerSelectionTool(server: McpServer, activity: ToolActivity): void {
  server.registerTool(
    'get_selection',
    {
      title: 'Get the selected layer',
      description:
        'Get the layer the user selected in the Vision app for this file: its id, type, readable label, artboard, page and fields, with its direct children summarized. Call this whenever the user says "the selected layer", "this layer", "the selection" or "what I selected".',
      inputSchema: z.object({ file }),
      annotations: { readOnlyHint: true },
    },
    async ({ file }, ctx) => {
      const answer = await askSelection(socketPath(), file);
      if (answer.status !== 'open') return textResult(unansweredText(answer, file));
      const ids = answer.selection.nodeIds;
      if (ids.length === 0) return textResult(nothingSelectedText(file));
      const { result } = await readDesign(file);
      if (!result.ok) return errorResult(invalidText(file, result.diagnostics));
      const selected = ids.flatMap((id) => {
        const layer = locate(result.document, id);
        return layer === undefined ? [] : [layer];
      });
      const [first] = selected;
      if (first === undefined) {
        return textResult(
          `The layer selected in Vision (${ids.join(', ')}) isn't in ${file} anymore. Select a layer in Vision, then ask again.`,
        );
      }
      activity.looking(ctx, file, {
        kind: 'look',
        artboard: first.artboard.id,
        ...('type' in first.layer ? { node: first.layer.id } : {}),
        summary: `is looking at ${layerLabel(first.layer)}`,
      });
      const page = first.page;
      return textResult(
        [
          `${plural(selected.length, 'layer')} selected in Vision on page ${JSON.stringify(page.name)}. Children are summarized; call get_tree or get_node with an id to see more.`,
          '',
          JSON.stringify(
            {
              page: { id: page.id, name: page.name },
              selection: selected.map(describeSelected),
            },
            null,
            2,
          ),
        ].join('\n'),
      );
    },
  );
}

interface Selected {
  page: Page;
  artboard: Artboard;
  layer: Artboard | Node;
}

function locate(document: VisionDocument, id: string): Selected | undefined {
  const located = findById(document, id);
  if (located?.kind === 'artboard') {
    return { page: located.page, artboard: located.artboard, layer: located.artboard };
  }
  if (located?.kind === 'node') {
    return { page: located.page, artboard: located.artboard, layer: located.node };
  }
  return undefined;
}

function describeSelected({ artboard, layer }: Selected): Record<string, unknown> {
  const children: Node[] = 'children' in layer ? (layer.children ?? []) : [];
  const fields = Object.fromEntries(Object.entries(layer).filter(([key]) => key !== 'children'));
  return {
    id: layer.id,
    type: 'type' in layer ? layer.type : 'artboard',
    label: layerLabel(layer),
    ...(layer.name === undefined || layer.name === '' ? {} : { name: layer.name }),
    artboard: { id: artboard.id, name: artboard.name },
    node:
      children.length === 0
        ? fields
        : {
            ...fields,
            childCount: children.length,
            children: children.slice(0, maxChildren).map((child) => ({
              type: child.type,
              id: child.id,
              label: layerLabel(child),
            })),
          },
  };
}

function unansweredText(answer: Exclude<SelectionAnswer, { status: 'open' }>, file: string) {
  switch (answer.status) {
    case 'not-running':
      return `Vision isn't running, so there's no selection to read. Open ${file} in Vision, select a layer, then ask again.`;
    case 'no-answer':
      return `Vision didn't answer within a second. Make sure ${file} is open in Vision, select a layer, then ask again.`;
    case 'not-open':
      return `${file} isn't open in Vision. Open it, select a layer, then ask again.`;
  }
}

function nothingSelectedText(file: string): string {
  return `Nothing is selected in ${file}. Select a layer in Vision, then ask again.`;
}
