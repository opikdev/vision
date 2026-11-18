import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { findIcons } from '../icons/library';
import { textResult } from '../results';

const defaultLimit = 10;

export function registerIconTools(server: McpServer): void {
  server.registerTool(
    'find_icons',
    {
      title: 'Find icons',
      description:
        'Search the Hugeicons names that write_html draws from <i data-icon="name">. Returns the best matches, one name per line.',
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .describe(
            'What the icon shows, in a word or two, such as "cart", "arrow left" or "user".',
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .exactOptional()
          .describe(`How many names to return; ${defaultLimit} if left out.`),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    ({ query, limit }) => {
      const names = findIcons(query, limit ?? defaultLimit);
      return textResult(
        names.length === 0
          ? `No icon matches "${query}". Try one simpler word, such as "cart" or "user".`
          : names.join('\n'),
      );
    },
  );
}
