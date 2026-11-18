import type { McpServer } from '@modelcontextprotocol/server';
import {
  findById,
  outline,
  svgIconName,
  tokenGroups,
  type Artboard,
  type Located,
  type Node,
  type VisionDocument,
} from '@vision/format';
import { readDesign } from '@vision/format/node';
import { z } from 'zod';
import type { ToolActivity } from '../activity/tool-activity';
import { inspectDesign, invalidText, missingText, plural, problemCounts } from '../design';
import { guide } from '../guide';
import { errorResult, textResult } from '../results';
import { file, id } from '../schemas';

const readOnly = { readOnlyHint: true, idempotentHint: true } as const;
const designDepth = 3;

export function registerReadTools(server: McpServer, activity: ToolActivity): void {
  server.registerTool(
    'get_guide',
    {
      title: 'Read the format guide',
      description:
        'Call this first, once per session. Explains .vis designs: nodes, Tailwind classes, tokens, the HTML that write_html accepts and a good working loop.',
      inputSchema: z.object({ file: file.exactOptional() }),
      annotations: readOnly,
    },
    () => textResult(guide),
  );

  server.registerTool(
    'get_overview',
    {
      title: 'Get an overview',
      description:
        "List the design's pages and artboards (ids, names, sizes, positions), its tokens and how many errors and warnings it has.",
      inputSchema: z.object({ file }),
      annotations: readOnly,
    },
    async ({ file }, ctx) => {
      activity.reading(ctx, file);
      const { exists, document, diagnostics } = await inspectDesign(file);
      if (!exists) return textResult(missingText(file));
      if (document === undefined) return textResult(invalidText(file, diagnostics));
      return textResult(
        [
          file,
          '',
          ...pagesOverview(document),
          '',
          ...tokensOverview(document),
          '',
          `Problems: ${problemCounts(diagnostics)}${diagnostics.length > 0 ? '. Call validate for details.' : '.'}`,
        ].join('\n'),
      );
    },
  );

  server.registerTool(
    'get_tree',
    {
      title: 'Get the node tree',
      description:
        "Show an indented outline of the design, or of one page, artboard or frame: each node's type, id, name, classes and text.",
      inputSchema: z.object({
        file,
        id: id(
          'Id of the page, artboard or frame to outline. Leave it out to outline the whole design.',
        ).exactOptional(),
        depth: z
          .number()
          .int()
          .min(0)
          .exactOptional()
          .describe(
            `How many levels below the top to show; 0 shows only the top. Leave it out to show everything under an id, or ${designDepth} levels of the whole design (pages, artboards and two levels of nodes).`,
          ),
      }),
      annotations: readOnly,
    },
    async ({ file, id, depth }, ctx) => {
      activity.reading(ctx, file);
      const { result } = await readDesign(file);
      if (!result.ok) return errorResult(invalidText(file, result.diagnostics));
      if (id !== undefined && findById(result.document, id) === undefined) {
        return errorResult(notFound(id));
      }
      const shown = outline(
        result.document,
        id,
        depth ?? (id === undefined ? designDepth : undefined),
      );
      const hidden = outline(result.document, id).split('\n').length - shown.split('\n').length;
      if (hidden === 0) return textResult(shown);
      return textResult(
        `${shown}\n\n${plural(hidden, 'deeper node')} not shown. Pass the id of an artboard or frame, or a larger depth, to see them.`,
      );
    },
  );

  server.registerTool(
    'get_node',
    {
      title: 'Get a node',
      description:
        "Get one node, artboard or page as JSON, with all its fields and children. The markup of svg nodes inside it is summarised; get_node on an svg node's own id shows it.",
      inputSchema: z.object({ file, id: id('Id of the node, artboard or page.') }),
      annotations: readOnly,
    },
    async ({ file, id }, ctx) => {
      activity.reading(ctx, file);
      const { result } = await readDesign(file);
      if (!result.ok) return errorResult(invalidText(file, result.diagnostics));
      const located = findById(result.document, id);
      if (located === undefined) return errorResult(notFound(id));
      return textResult(JSON.stringify(valueOf(located), null, 2));
    },
  );
}

function pagesOverview(document: VisionDocument): string[] {
  return [
    'Pages:',
    ...document.pages.flatMap((page) => [
      `- page ${page.id} ${JSON.stringify(page.name)}`,
      ...page.artboards.map(
        (artboard) =>
          `  - artboard ${artboard.id} ${JSON.stringify(artboard.name)} ${artboard.width}x${artboard.height} at ${artboard.x},${artboard.y}`,
      ),
    ]),
  ];
}

function tokensOverview(document: VisionDocument): string[] {
  const lines = tokenGroups.flatMap((group) => {
    const names = Object.keys(document.tokens?.[group] ?? {});
    return names.length === 0 ? [] : [`- ${group}: ${names.join(', ')}`];
  });
  return lines.length === 0 ? ['Tokens: none'] : ['Tokens:', ...lines];
}

function valueOf(located: Located): unknown {
  switch (located.kind) {
    case 'page':
      return { ...located.page, artboards: located.page.artboards.map(summariseArtboard) };
    case 'artboard':
      return summariseArtboard(located.artboard);
    case 'node':
      return located.node.type === 'svg' ? located.node : summariseSvgs(located.node);
  }
}

function summariseArtboard(artboard: Artboard): Artboard {
  return { ...artboard, children: artboard.children.map(summariseSvgs) };
}

function summariseSvgs(node: Node): Node {
  switch (node.type) {
    case 'svg': {
      const icon = svgIconName(node.svg);
      const what = icon === undefined ? 'svg' : `icon ${icon}`;
      return { ...node, svg: `[${what}: ${node.svg.length} characters of markup not shown]` };
    }
    case 'frame':
      return node.children === undefined
        ? node
        : { ...node, children: node.children.map(summariseSvgs) };
    case 'text':
    case 'image':
      return node;
  }
}

function notFound(id: string): string {
  return `No page, artboard or node has id "${id}". Call get_tree to see the ids.`;
}
