import type { McpServer } from '@modelcontextprotocol/server';
import { createArtboard, createPage, updateArtboard } from '@vision/format';
import { z } from 'zod';
import type { ToolActivity } from '../activity/tool-activity';
import { runEdit } from '../edit';
import { file, id, newId } from '../schemas';

const size = (side: string) =>
  z
    .number()
    .describe(
      `${side} in px, from 1 to 10000. The artboard is the viewport its content is laid out in.`,
    );
const coordinate = (axis: string) =>
  z.number().describe(`${axis} position on the page's canvas, in px. Artboards shouldn't overlap.`);

export function registerArtboardTools(server: McpServer, activity: ToolActivity): void {
  server.registerTool(
    'create_page',
    {
      title: 'Create a page',
      description: 'Add an empty page to the design. Returns its id.',
      inputSchema: z.object({
        file,
        name: z.string().describe('Page name, such as "Checkout".'),
        id: newId('page'),
      }),
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    ({ file, ...options }, ctx) =>
      runEdit(file, activity.editing(ctx, file), (doc) => {
        const { document, page } = createPage(doc, options);
        return {
          document,
          summary: `Added page ${page.id} ${JSON.stringify(page.name)}.`,
          structured: { id: page.id },
        };
      }),
  );

  server.registerTool(
    'create_artboard',
    {
      title: 'Create an artboard',
      description:
        'Add an artboard (one screen) to a page, to the right of the existing artboards unless x and y are given. Returns its id.',
      inputSchema: z.object({
        file,
        name: z.string().describe('Artboard name, such as "Cart, mobile".'),
        width: size('Width'),
        height: size('Height'),
        page: id(
          'Id of the page to add it to. Leave it out to use the first page.',
        ).exactOptional(),
        x: coordinate('Horizontal').exactOptional(),
        y: coordinate('Vertical').exactOptional(),
        class: z
          .string()
          .exactOptional()
          .describe('Tailwind classes for the artboard\'s root box, such as "bg-white font-sans".'),
        id: newId('artboard'),
      }),
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    ({ file, ...options }, ctx) =>
      runEdit(file, activity.editing(ctx, file), (doc) => {
        const { document, artboard } = createArtboard(doc, options);
        return {
          document,
          summary: `Added artboard ${artboard.id} ${JSON.stringify(artboard.name)}, ${artboard.width}x${artboard.height} at ${artboard.x},${artboard.y}.`,
          structured: { id: artboard.id },
        };
      }),
  );

  server.registerTool(
    'update_artboard',
    {
      title: 'Update an artboard',
      description: 'Rename, move, resize or restyle an artboard. Only the fields you pass change.',
      inputSchema: z.object({
        file,
        id: id('Id of the artboard.'),
        name: z.string().exactOptional().describe('New name.'),
        x: coordinate('New horizontal').exactOptional(),
        y: coordinate('New vertical').exactOptional(),
        width: size('New width').exactOptional(),
        height: size('New height').exactOptional(),
        class: z
          .string()
          .nullable()
          .exactOptional()
          .describe(
            "New Tailwind classes for the artboard's root box, replacing the old ones. null removes them.",
          ),
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    ({ file, id, ...patch }, ctx) =>
      runEdit(file, activity.editing(ctx, file), (doc) => ({
        document: updateArtboard(doc, id, patch),
        summary: `Updated artboard ${id}.`,
      })),
  );
}
