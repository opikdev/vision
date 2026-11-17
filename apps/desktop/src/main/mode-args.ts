import { isAbsolute } from 'node:path';
import { z } from 'zod';

export type ModeArgs<Request> =
  { kind: 'none' } | { kind: 'invalid'; message: string } | { kind: 'request'; request: Request };

/**
 * Reads a headless mode's `--name=value` options. Each option is one argument, so a value can never
 * be read as a Chromium switch; options without `=` and unknown ones are ignored.
 */
export function parseModeArgs<Schema extends z.ZodType>(
  argv: readonly string[],
  modeFlag: string,
  flags: Record<string, string>,
  schema: Schema,
): ModeArgs<z.output<Schema>> {
  if (!argv.some((arg) => arg === modeFlag || arg.startsWith(`${modeFlag}=`))) {
    return { kind: 'none' };
  }
  const values: Record<string, string> = {};
  for (const arg of argv) {
    const separator = arg.indexOf('=');
    const name = arg.slice(0, separator);
    const key = Object.hasOwn(flags, name) ? flags[name] : undefined;
    if (separator === -1 || key === undefined) continue;
    values[key] = arg.slice(separator + 1);
  }
  const parsed = schema.safeParse(values);
  if (!parsed.success)
    return { kind: 'invalid', message: parsed.error.issues[0]?.message ?? 'Invalid arguments' };
  return { kind: 'request', request: parsed.data };
}

export function absolutePath(flag: string, extension: string) {
  return z
    .string({ error: `Missing ${flag}=<absolute ${extension} path>` })
    .refine((value) => isAbsolute(value) && value.endsWith(extension), {
      error: (issue) => `${flag} needs an absolute ${extension} path, got "${String(issue.input)}"`,
    });
}
