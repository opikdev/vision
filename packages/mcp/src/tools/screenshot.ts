import type { McpServer } from '@modelcontextprotocol/server';
import { idPattern } from '@vision/format';
import { z } from 'zod';
import { fileExists } from '../design';
import { errorResult, imageResult } from '../results';
import { file, id } from '../schemas';
import { currentRuntime, resolveApp, ScreenshotError, takeScreenshot } from '../screenshot';

const appHint =
  'To use another build of Vision, set VISION_APP to its executable, and VISION_APP_ENTRY to its app folder for a development build.';

export function registerScreenshotTool(server: McpServer): void {
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
          .describe('Pixel density: 1 for 1x, 2 for sharper 2x images with four times the pixels.'),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ file, artboard, scale }) => {
      if (!(await fileExists(file))) {
        return errorResult(`${file} doesn't exist yet. Create an artboard first.`);
      }
      const app = resolveApp(currentRuntime());
      if (app === undefined) {
        return errorResult(`Vision isn't installed. Install Vision in /Applications. ${appHint}`);
      }
      try {
        const png = await takeScreenshot(app, { file, artboard, scale });
        return imageResult(`Artboard ${artboard} at ${scale}x.`, png);
      } catch (error) {
        if (error instanceof ScreenshotError) return errorResult(`${error.message}\n${appHint}`);
        throw error;
      }
    },
  );
}
