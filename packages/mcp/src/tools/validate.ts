import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { describeProblems, inspectDesign, missingText } from '../design';
import { textResult } from '../results';
import { file } from '../schemas';

export function registerValidateTool(server: McpServer): void {
  server.registerTool(
    'validate',
    {
      title: 'Validate',
      description:
        'List every error and warning in the design, such as unknown classes or missing images, with how to fix each.',
      inputSchema: z.object({ file }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ file }) => {
      const { exists, diagnostics } = await inspectDesign(file);
      return textResult(exists ? describeProblems(diagnostics) : missingText(file));
    },
  );
}
