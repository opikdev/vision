import type { McpServer } from '@modelcontextprotocol/server';
import { findById, idPattern, type Artboard } from '@vision/format';
import { readDesign } from '@vision/format/node';
import { z } from 'zod';
import { describeReview } from '../activity/describe';
import type { ToolActivity } from '../activity/tool-activity';
import { invalidText } from '../design';
import { errorResult, textResult } from '../results';
import { describeReport, takeReview } from '../review';
import { file, id } from '../schemas';
import { appHint, currentRuntime, resolveApp, VisionAppError } from '../vision-app';

export function registerReviewTool(server: McpServer, activity: ToolActivity): void {
  server.registerTool(
    'review',
    {
      title: 'Review the design',
      description:
        'Check the design as Vision draws it for problems people would see: low contrast, text cut off or overlapping, content past the artboard, off-grid spacing, too many font sizes, raw values that match a token, small touch targets on phone artboards and placeholder content. Returns a score out of 100 and each finding with the layer, what was measured and how to fix it. Call it after building or changing an artboard, and fix every error.',
      inputSchema: z.object({
        file,
        artboard: id('Id of one artboard to review. Leave it out to review them all.')
          .regex(idPattern)
          .exactOptional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ file, artboard }, ctx) => {
      const { exists, result } = await readDesign(file);
      if (!exists) return errorResult(`${file} doesn't exist yet. Create an artboard first.`);
      if (!result.ok) return errorResult(invalidText(file, result.diagnostics));
      let reviewed: Artboard | undefined;
      if (artboard !== undefined) {
        const located = findById(result.document, artboard);
        if (located?.kind !== 'artboard') {
          return errorResult(`No artboard has id "${artboard}". Call get_overview to see the ids.`);
        }
        reviewed = located.artboard;
      }
      activity.looking(ctx, file, describeReview(reviewed));
      const app = resolveApp(currentRuntime());
      if (app === undefined) {
        return errorResult(`Vision isn't installed. Install Vision in /Applications. ${appHint}`);
      }
      try {
        const report = await takeReview(app, file, artboard);
        return textResult(describeReport(report), {
          score: report.score,
          counts: report.counts,
        });
      } catch (error) {
        if (error instanceof VisionAppError) return errorResult(`${error.message}\n${appHint}`);
        throw error;
      }
    },
  );
}
