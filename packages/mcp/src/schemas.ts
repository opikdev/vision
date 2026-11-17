import { isAbsolute } from 'node:path';
import { z } from 'zod';

export const file = z
  .string()
  .refine(isAbsolute, {
    error: (issue) =>
      `file must be an absolute path, such as /Users/me/designs/app.vis, not ${JSON.stringify(issue.input)}`,
  })
  .refine((path) => path.endsWith('.vis'), {
    error: (issue) => `file must be a .vis file, not ${JSON.stringify(issue.input)}`,
  })
  .describe(
    "Absolute path of the .vis design file, such as /Users/me/designs/app.vis. It doesn't need to exist yet: the first edit creates it.",
  );

export function id(description: string) {
  return z.string().min(1).describe(description);
}

export function newId(what: string) {
  return z
    .string()
    .exactOptional()
    .describe(
      `Id for the new ${what}: letters, digits, "-" and "_", unique in the design. Leave it out to generate one from the name.`,
    );
}

export const index = z
  .number()
  .int()
  .min(0)
  .exactOptional()
  .describe("Position among the parent's children, from 0. Leave it out to add at the end.");
