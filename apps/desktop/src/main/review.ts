import { findById, layoutSchema, reviewDesign, type Layout } from '@vision/format';
import { writeFile } from 'node:fs/promises';
import { channels } from '../shared/channels';
import { captureMessageSchema } from '../shared/schemas';
import { errorMessage } from './errors';
import { deadline, loadDesign, runHeadless, serveDesign } from './headless';
import { handleWith } from './ipc';
import type { ReviewRequest } from './review-args';
import { createBrowserWindow } from './windows';

const timeoutMs = 30_000;

export function runReview(request: ReviewRequest): void {
  runHeadless(() => review(request));
}

async function review({ file, out, artboard }: ReviewRequest): Promise<void> {
  const document = await loadDesign(file);
  if (artboard !== undefined && findById(document, artboard)?.kind !== 'artboard') {
    throw new Error(`No artboard with id "${artboard}" in ${file}`);
  }
  serveDesign(file, document);

  const { promise: measured, resolve, reject } = Promise.withResolvers<Layout>();
  handleWith(channels.reviewReady, layoutSchema, (_window, layout) => {
    resolve(layout);
  });
  handleWith(channels.captureFailed, captureMessageSchema, (_window, message) => {
    reject(new Error(message));
  });
  const timer = deadline(timeoutMs, `${file} to be drawn and measured`);

  const window = createBrowserWindow(
    { width: 800, height: 600, show: false, frame: false, webPreferences: { offscreen: true } },
    artboard === undefined ? { mode: 'review' } : { mode: 'review', artboard },
    (error) => {
      reject(new Error(`Vision's interface didn't load: ${errorMessage(error)}`));
    },
  );
  window.webContents.on('render-process-gone', (_event, details) => {
    reject(new Error(`Drawing ${file} stopped: the renderer ${details.reason}`));
  });
  const layout = await Promise.race([measured, timer.expired]);
  timer.clear();
  const report = reviewDesign(document, layout, artboard);
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  window.destroy();
}
