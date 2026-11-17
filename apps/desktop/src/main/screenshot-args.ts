import { isAbsolute } from 'node:path';
import { z } from 'zod';

export const screenshotFlag = '--vision-screenshot';

const requestSchema = z.object({
  file: z
    .string({ error: `Missing ${screenshotFlag} <absolute .vis path>` })
    .refine((value) => isAbsolute(value) && value.endsWith('.vis'), {
      error: (issue) =>
        `${screenshotFlag} needs an absolute .vis path, got "${String(issue.input)}"`,
    }),
  artboard: z.string({ error: 'Missing --artboard <id>' }).min(1, 'Missing --artboard <id>'),
  out: z
    .string({ error: 'Missing --out <absolute .png path>' })
    .refine((value) => isAbsolute(value) && value.endsWith('.png'), {
      error: (issue) => `--out needs an absolute .png path, got "${String(issue.input)}"`,
    }),
  scale: z
    .enum(['1', '2'], { error: (issue) => `--scale must be 1 or 2, got "${String(issue.input)}"` })
    .default('1')
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
  if (!argv.includes(screenshotFlag)) return { kind: 'none' };
  const values: Partial<Record<(typeof flags)[keyof typeof flags], string>> = {};
  for (const [index, arg] of argv.entries()) {
    if (!Object.hasOwn(flags, arg)) continue;
    const value = argv[index + 1];
    if (value !== undefined && !value.startsWith('--'))
      values[flags[arg as keyof typeof flags]] = value;
  }
  const parsed = requestSchema.safeParse(values);
  if (!parsed.success)
    return { kind: 'invalid', message: parsed.error.issues[0]?.message ?? 'Invalid arguments' };
  return { kind: 'request', request: parsed.data };
}
