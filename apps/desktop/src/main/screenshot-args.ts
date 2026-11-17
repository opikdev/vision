import { z } from 'zod';
import { absolutePath, parseModeArgs, type ModeArgs } from './mode-args';

export const screenshotFlag = '--vision-screenshot';

const requestSchema = z.object({
  file: absolutePath(screenshotFlag, '.vis'),
  artboard: z.string({ error: 'Missing --artboard=<id>' }).min(1, 'Missing --artboard=<id>'),
  out: absolutePath('--out', '.png'),
  scale: z
    .string()
    .default('1')
    .refine((value) => /^\d*\.?\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2, {
      error: (issue) => `--scale must be a number above 0, up to 2, got "${String(issue.input)}"`,
    })
    .transform(Number),
});

export type ScreenshotRequest = z.infer<typeof requestSchema>;

const flags = {
  [screenshotFlag]: 'file',
  '--artboard': 'artboard',
  '--out': 'out',
  '--scale': 'scale',
};

export function parseScreenshotArgs(argv: readonly string[]): ModeArgs<ScreenshotRequest> {
  return parseModeArgs(argv, screenshotFlag, flags, requestSchema);
}
