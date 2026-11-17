import type { McpServer } from '@modelcontextprotocol/server';
import { setTokens, tokenGroups } from '@vision/format';
import { z } from 'zod';
import type { ToolActivity } from '../activity/tool-activity';
import { runEdit } from '../edit';
import { file } from '../schemas';

export function registerTokenTools(server: McpServer, activity: ToolActivity): void {
  server.registerTool(
    'set_tokens',
    {
      title: 'Set tokens',
      description:
        'Add, change or delete design tokens: colors, fonts, text sizes, radii, shadows and spacing. Each token becomes Tailwind classes, such as color.brand → bg-brand. Merges into the existing tokens.',
      inputSchema: z.object({
        file,
        tokens: z
          .partialRecord(z.enum(tokenGroups), z.record(z.string(), z.string().nullable()))
          .describe(
            'Token groups (color, font, text, radius, shadow, spacing) mapping token names to CSS values; null deletes a token. Names are lowercase words joined by "-". Example: {"color": {"brand": "#1F3D2B", "old": null}, "radius": {"card": "12px"}}.',
          ),
      }),
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    ({ file, tokens }, ctx) =>
      runEdit(file, activity.editing(ctx, file), (doc) => {
        const document = setTokens(doc, tokens);
        const groups = tokenGroups.flatMap((group) => {
          const names = Object.keys(document.tokens?.[group] ?? {});
          return names.length === 0 ? [] : [`${group}: ${names.join(', ')}`];
        });
        return {
          document,
          summary: `Tokens are now ${groups.length === 0 ? 'empty' : groups.join('; ')}.`,
        };
      }),
  );
}
