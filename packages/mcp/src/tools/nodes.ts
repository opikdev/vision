import type { McpServer } from '@modelcontextprotocol/server';
import { deleteById, insertHtml, moveNode, outline, updateNode } from '@vision/format';
import { z } from 'zod';
import { plural } from '../design';
import type { ToolActivity } from '../activity/tool-activity';
import { runEdit } from '../edit';
import { resolveIcon } from '../icons/library';
import { file, id, index } from '../schemas';

const field = (description: string) => z.string().nullable().exactOptional().describe(description);

export function registerNodeTools(server: McpServer, activity: ToolActivity): void {
  server.registerTool(
    'write_html',
    {
      title: 'Write HTML',
      description:
        "Convert HTML with Tailwind classes into nodes inside an artboard or frame. Build one section per call. Returns the new nodes' outline with their ids.",
      inputSchema: z.object({
        file,
        parent: id('Id of the artboard or frame to add the nodes to.'),
        html: z
          .string()
          .describe(
            'HTML with Tailwind CSS v4 classes, such as <div class="flex flex-col gap-2 p-6"><h1 class="text-2xl font-bold">Cart</h1></div>. Icons by name: <i data-icon="shopping-cart-01" class="size-5"></i>. No style attributes, scripts or tables; get_guide lists the supported elements.',
          ),
        index,
        replace: z
          .boolean()
          .exactOptional()
          .describe(
            "true removes the parent's existing children first. Can't be combined with index.",
          ),
      }),
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    ({ file, ...options }, ctx) =>
      runEdit(file, activity.editing(ctx, file), (doc) => {
        const { document, ids } = insertHtml(doc, { ...options, icon: resolveIcon });
        const tree = ids.map((id) => outline(document, id)).join('\n');
        return {
          document,
          summary: `Added ${plural(ids.length, 'node')} to ${options.parent}${tree === '' ? '.' : `:\n${tree}`}`,
          structured: { ids },
        };
      }),
  );

  server.registerTool(
    'update_node',
    {
      title: 'Update a node',
      description:
        "Change a node's class, text, src, alt, svg or name. Only the fields you pass change; null clears name, class or alt.",
      inputSchema: z.object({
        file,
        id: id('Id of the node.'),
        class: field('Tailwind classes, replacing the current ones.'),
        text: field('Text of a text node. \\n starts a new line.'),
        src: field(
          'Image source of an image node: a path inside the assets folder, or an https: URL.',
        ),
        alt: field('Alternative text of an image node.'),
        svg: field('SVG markup of an svg node: a single <svg> element.'),
        name: field('Optional label for people and AIs reading the file.'),
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    ({ file, id, ...patch }, ctx) =>
      runEdit(file, activity.editing(ctx, file), (doc) => ({
        document: updateNode(doc, id, patch),
        summary: `Updated node ${id}.`,
      })),
  );

  server.registerTool(
    'move_node',
    {
      title: 'Move a node',
      description:
        'Move a node, with its children, into another artboard or frame, or to another position in the same parent.',
      inputSchema: z.object({
        file,
        id: id('Id of the node to move.'),
        parent: id(
          'Id of the artboard or frame to move it into. Pass its current parent to reorder.',
        ),
        index,
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    ({ file, id, ...target }, ctx) =>
      runEdit(file, activity.editing(ctx, file), (doc) => ({
        document: moveNode(doc, id, target),
        summary: `Moved node ${id} into ${target.parent}.`,
      })),
  );

  server.registerTool(
    'delete',
    {
      title: 'Delete',
      description: 'Delete a node, artboard or page by id, with everything inside it.',
      inputSchema: z.object({ file, id: id('Id of the node, artboard or page to delete.') }),
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    ({ file, id }, ctx) =>
      runEdit(file, activity.editing(ctx, file), (doc) => ({
        document: deleteById(doc, id),
        summary: `Deleted ${id} and everything inside it.`,
      })),
  );
}
