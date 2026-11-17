import { z } from 'zod';

export const maxLineBytes = 64 * 1024;
export const maxNodes = 500;

const id = z.string().min(1).max(256);
const summary = z.string().min(1).max(200);

export const activitySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('edit'),
    artboard: id.exactOptional(),
    nodes: z.array(id).max(maxNodes),
    summary,
  }),
  z.object({ kind: z.literal('look'), artboard: id.exactOptional(), summary }),
  z.object({ kind: z.literal('done') }),
]);

export const activityMessageSchema = z.object({
  v: z.literal(1),
  session: z.uuid(),
  agent: z.string().min(1).max(64),
  file: z.string().min(1).max(4096),
  at: z.number().int().nonnegative(),
  activity: activitySchema,
});

export type Activity = z.infer<typeof activitySchema>;
export type ActivityMessage = z.infer<typeof activityMessageSchema>;

export function encodeActivity(message: ActivityMessage): string | undefined {
  const line = `${JSON.stringify(message)}\n`;
  return new TextEncoder().encode(line).length > maxLineBytes ? undefined : line;
}

export function parseActivity(line: string): ActivityMessage | undefined {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return undefined;
  }
  const result = activityMessageSchema.safeParse(value);
  return result.success ? result.data : undefined;
}
