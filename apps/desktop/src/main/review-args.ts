import { z } from 'zod';
import { absolutePath, parseModeArgs, type ModeArgs } from './mode-args';

export const reviewFlag = '--vision-review';

const requestSchema = z.object({
  file: absolutePath(reviewFlag, '.vis'),
  out: absolutePath('--out', '.json'),
  artboard: z.string().min(1, '--artboard needs an id').optional(),
});

export type ReviewRequest = z.infer<typeof requestSchema>;

const flags = { [reviewFlag]: 'file', '--out': 'out', '--artboard': 'artboard' };

export function parseReviewArgs(argv: readonly string[]): ModeArgs<ReviewRequest> {
  return parseModeArgs(argv, reviewFlag, flags, requestSchema);
}
