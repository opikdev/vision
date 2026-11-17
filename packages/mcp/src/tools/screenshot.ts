import type { McpServer } from '@modelcontextprotocol/server';
import { findById, idPattern } from '@vision/format';
import { readDesign } from '@vision/format/node';
import { z } from 'zod';
import type { ToolActivity } from '../activity/tool-activity';
import { invalidText } from '../design';
import { errorResult, imageResult } from '../results';
import { file, id } from '../schemas';
import { maxScreenshotSide, screenshotSize, takeScreenshot } from '../screenshot';
import { appHint, currentRuntime, resolveApp, VisionAppError } from '../vision-app';

export function registerScreenshotTool(server: McpServer, activity: ToolActivity): void {
  server.registerTool(
    'screenshot',
    {
      title: 'Take a screenshot',
      description:
        'Render an artboard to a PNG with the Vision app, exactly as Vision draws it. Use it to check your work.',
      inputSchema: z.object({
        file,
        artboard: id('Id of the artboard to render.').regex(idPattern),
        scale: z
          .union([z.literal(1), z.literal(2)])
          .default(1)
          .describe(
            `Pixel density: 1 for 1x, 2 for sharper 2x images with four times the pixels. Images are scaled down so their longest side is at most ${maxScreenshotSide} px.`,
          ),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ file, artboard, scale }, ctx) => {
      const { exists, result } = await readDesign(file);
      if (!exists) return errorResult(`${file} doesn't exist yet. Create an artboard first.`);
      if (!result.ok) return errorResult(invalidText(file, result.diagnostics));
      const located = findById(result.document, artboard);
      if (located?.kind !== 'artboard') {
        return errorResult(`No artboard has id "${artboard}". Call get_overview to see the ids.`);
      }
      activity.screenshotting(ctx, file, located.artboard);
      const { width, height } = located.artboard;
      const size = screenshotSize(width, height, scale);
      const app = resolveApp(currentRuntime());
      if (app === undefined) {
        return errorResult(`Vision isn't installed. Install Vision in /Applications. ${appHint}`);
      }
      try {
        const png = await takeScreenshot(app, { file, artboard, scale: size.scale });
        const used = Number(size.scale.toFixed(2));
        return imageResult(
          `Artboard ${artboard} at ${used}x (${width}×${height} → ${size.width}×${size.height}).`,
          png,
        );
      } catch (error) {
        if (error instanceof VisionAppError) return errorResult(`${error.message}\n${appHint}`);
        throw error;
      }
    },
  );
}
