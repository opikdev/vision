import { isAbsolute } from 'node:path';
import { z } from 'zod';

export const screenshotFlag = '--vision-screenshot';

const requestSchema = z.object({
  file: z
    .string({ error: `Missing ${screenshotFlag}=<absolute .vis path>` })
    .refine((value) => isAbsolute(value) && value.endsWith('.vis'), {
      error: (issue) =>
        `${screenshotFlag} needs an absolute .vis path, got "${String(issue.input)}"`,
    }),
  artboard: z.string({ error: 'Missing --artboard=<id>' }).min(1, 'Missing --artboard=<id>'),
  out: z
    .string({ error: 'Missing --out=<absolute .png path>' })
    .refine((value) => isAbsolute(value) && value.endsWith('.png'), {
      error: (issue) => `--out needs an absolute .png path, got "${String(issue.input)}"`,
    }),
  scale: z
    .string()
    .default('1')
    .refine((value) => /^\d*\.?\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2, {
      error: (issue) => `--scale must be a number above 0, up to 2, got "${String(issue.input)}"`,
    })
    .transform(Number),
});

export type ScreenshotRequest = z.infer<typeof requestSchema>;

export type ScreenshotArgs =
  | { kind: 'none' }
  | { kind: 'invalid'; message: string }
  | { kind: 'request'; request: ScreenshotRequest };

const flags = {
  [screenshotFlag]: 'file',
  '--artboard': 'artboard',
  '--out': 'out',
  '--scale': 'scale',
} as const;

export function parseScreenshotArgs(argv: readonly string[]): ScreenshotArgs {
  if (!argv.some((arg) => arg === screenshotFlag || arg.startsWith(`${screenshotFlag}=`))) {
    return { kind: 'none' };
  }
  const values: Partial<Record<(typeof flags)[keyof typeof flags], string>> = {};
  for (const arg of argv) {
    const separator = arg.indexOf('=');
    const name = arg.slice(0, separator);
    if (separator === -1 || !Object.hasOwn(flags, name)) continue;
    values[flags[name as keyof typeof flags]] = arg.slice(separator + 1);
  }
  const parsed = requestSchema.safeParse(values);
  if (!parsed.success)
    return { kind: 'invalid', message: parsed.error.issues[0]?.message ?? 'Invalid arguments' };
  return { kind: 'request', request: parsed.data };
}
