import { findById } from '@vision/format';
import { writeFile } from 'node:fs/promises';
import { channels } from '../shared/channels';
import { captureMessageSchema } from '../shared/schemas';
import { errorMessage } from './errors';
import { deadline, loadDesign, runHeadless, serveDesign } from './headless';
import { handle, handleWith } from './ipc';
import type { ScreenshotRequest } from './screenshot-args';
import { createBrowserWindow } from './windows';

const timeoutMs = 20_000;

export function runScreenshot(request: ScreenshotRequest): void {
  runHeadless(() => capture(request));
}

async function capture({
  file,
  artboard: artboardId,
  out,
  scale,
}: ScreenshotRequest): Promise<void> {
  const document = await loadDesign(file);
  const located = findById(document, artboardId);
  if (located?.kind !== 'artboard')
    throw new Error(`No artboard with id "${artboardId}" in ${file}`);
  const { width, height } = located.artboard;
  serveDesign(file, document);

  const { promise: rendered, resolve, reject } = Promise.withResolvers<undefined>();
  handle(channels.captureReady, () => {
    resolve(undefined);
  });
  handleWith(channels.captureFailed, captureMessageSchema, (_window, message) => {
    reject(new Error(message));
  });
  const timer = deadline(timeoutMs, `"${artboardId}" to render`);

  const window = createBrowserWindow(
    {
      width,
      height: height + 1,
      useContentSize: true,
      show: false,
      frame: false,
      enableLargerThanScreen: true,
      webPreferences: { offscreen: { deviceScaleFactor: scale > 1 ? 2 : 1 } },
    },
    { mode: 'capture', artboard: artboardId },
    (error) => {
      reject(new Error(`Vision's interface didn't load: ${errorMessage(error)}`));
    },
  );
  window.webContents.on('render-process-gone', (_event, details) => {
    reject(new Error(`Drawing "${artboardId}" stopped: the renderer ${details.reason}`));
  });
  const frame = markedFrame(window.webContents, width, height);
  await Promise.race([rendered, timer.expired]);
  window.webContents.invalidate();
  const image = await Promise.race([frame, timer.expired]);
  timer.clear();
  const size = {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
  const captured = image.getSize();
  const exact =
    captured.width === size.width && captured.height === size.height
      ? image
      : image.resize({ ...size, quality: 'best' });
  await writeFile(out, exact.toPNG());
  window.destroy();
}

// Offscreen frames reach main some time after the renderer draws them. The capture view paints
// a marker pixel in the extra row below the artboard after the design has drawn, so the first
// frame showing it holds the finished design.
function markedFrame(
  contents: Electron.WebContents,
  width: number,
  height: number,
): Promise<Electron.NativeImage> {
  return new Promise((resolve) => {
    const onPaint = (
      _event: Electron.Event,
      _dirty: Electron.Rectangle,
      image: Electron.NativeImage,
    ): void => {
      const ratio = image.getSize().width / width;
      const artboardHeight = Math.round(height * ratio);
      const [blue = 0, green = 255, red = 0] = image
        .crop({ x: 0, y: artboardHeight, width: 1, height: 1 })
        .toBitmap();
      if (red < 200 || green > 60 || blue < 200) return;
      contents.off('paint', onPaint);
      resolve(image.crop({ x: 0, y: 0, width: image.getSize().width, height: artboardHeight }));
    };
    contents.on('paint', onPaint);
  });
}
