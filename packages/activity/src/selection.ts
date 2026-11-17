import { z } from 'zod';
import { idSchema, maxLineBytes, maxNodes, parseLine } from './message';

export const selectionSchema = z.object({
  pageId: idSchema.nullable(),
  nodeIds: z.array(idSchema).max(maxNodes),
});

export const selectionRequestSchema = z.object({
  v: z.literal(1),
  id: z.uuid(),
  request: z.literal('selection'),
  file: z.string().min(1).max(4096),
});

export const selectionResponseSchema = z.object({
  v: z.literal(1),
  id: z.uuid(),
  response: z.discriminatedUnion('status', [
    z.object({ status: z.literal('not-open') }),
    z.object({ status: z.literal('open'), selection: selectionSchema }),
  ]),
});

export type Selection = z.infer<typeof selectionSchema>;
export type SelectionRequest = z.infer<typeof selectionRequestSchema>;
export type SelectionResponse = z.infer<typeof selectionResponseSchema>;

export function encodeLine(message: SelectionRequest | SelectionResponse): string | undefined {
  const line = `${JSON.stringify(message)}\n`;
  return new TextEncoder().encode(line).length > maxLineBytes ? undefined : line;
}

export function parseSelectionRequest(line: string): SelectionRequest | undefined {
  return parseLine(selectionRequestSchema, line);
}

export function parseSelectionResponse(line: string): SelectionResponse | undefined {
  return parseLine(selectionResponseSchema, line);
}
