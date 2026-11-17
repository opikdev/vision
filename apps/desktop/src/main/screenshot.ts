import { findById, formatDiagnostic } from '@vision/format';
import { assetsDirFor, readDesign } from '@vision/format/node';
import { app, nativeImage } from 'electron';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { channels } from '../shared/channels';
import type { DocumentState } from '../shared/contract';
import { captureMessageSchema } from '../shared/schemas';
import { AssetRegistry, handleAssetProtocol } from './asset-protocol';
import { errorMessage } from './errors';
import { handle, handleWith } from './ipc';
import { handleAppProtocol } from './protocols';
import { sanitizeDocument } from './sanitize-document';
import { createScreenshotProfile } from './screenshot-profile';
import type { ScreenshotRequest } from './screenshot-args';
import { hardenSessions, hardenWebContents } from './security';
import { createBrowserWindow } from './windows';

const timeoutMs = 20_000;
const quietMs = 250;
const settleLimitMs = 3_000;

export function failScreenshot(message: string): void {
  process.stderr.write(`${message.replace(/\s*\n\s*/g, ' ')}\n`);
  app.exit(1);
}

export function runScreenshot(request: ScreenshotRequest): void {
  let finished = false;
  const finish = (error?: unknown): void => {
    if (finished) return;
    finished = true;
    if (error === undefined) app.exit(0);
    else failScreenshot(errorMessage(error));
  };
  process.on('uncaughtException', finish);
  process.on('unhandledRejection', finish);
  if (!app.commandLine.hasSwitch('user-data-dir')) {
    try {
      app.setPath('userData', createScreenshotProfile(join(tmpdir(), 'vision-screenshots')));
    } catch (error) {
      finish(error);
      return;
    }
  }
  app.dock?.hide();
  hardenWebContents();
  app.on('window-all-closed', () => undefined);
  app
    .whenReady()
    .then(() => capture(request))
    .then(() => {
      finish();
    }, finish);
}

async function capture({
  file,
  artboard: artboardId,
  out,
  scale,
}: ScreenshotRequest): Promise<void> {
  const { exists, result } = await readDesign(file);
  if (!exists) throw new Error(`File not found: ${file}`);
  if (!result.ok) {
    const [first] = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    throw new Error(
      `${file} has errors: ${first === undefined ? 'unknown' : formatDiagnostic(first)}`,
    );
  }
  const located = findById(result.document, artboardId);
  if (located?.kind !== 'artboard')
    throw new Error(`No artboard with id "${artboardId}" in ${file}`);
  const { width, height } = located.artboard;

  hardenSessions();
  handleAppProtocol(join(__dirname, '../renderer'));
  const assets = new AssetRegistry();
  handleAssetProtocol(assets);
  const state: DocumentState = {
    revision: 1,
    path: file,
    displayPath: file,
    name: basename(file),
    status: 'ok',
    document: sanitizeDocument(result.document),
    diagnostics: [],
    readError: null,
    mtimeMs: null,
    assetToken: assets.register(assetsDirFor(file)),
    assetsVersion: 0,
  };

  const { promise: rendered, resolve, reject } = Promise.withResolvers<undefined>();
  handle(channels.getState, () => state);
  handle(channels.captureReady, () => {
    resolve(undefined);
  });
  handleWith(channels.captureFailed, captureMessageSchema, (_window, message) => {
    reject(new Error(message));
  });
  setTimeout(() => {
    reject(
      new Error(`Timed out after ${timeoutMs / 1000} s waiting for "${artboardId}" to render`),
    );
  }, timeoutMs);

  const window = createBrowserWindow(
    {
      width,
      height,
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
  await rendered;
  const image = await settledFrame(window.webContents);
  if (image.isEmpty()) throw new Error(`Vision didn't paint "${artboardId}"`);
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

// Offscreen frames reach main tens of milliseconds after the renderer commits them, so wait
// until painting goes quiet and keep the last frame.
function settledFrame(contents: Electron.WebContents): Promise<Electron.NativeImage> {
  return new Promise((resolve) => {
    let latest = nativeImage.createEmpty();
    let quiet: NodeJS.Timeout | undefined;
    const settle = (): void => {
      clearTimeout(quiet);
      clearTimeout(limit);
      contents.off('paint', onPaint);
      resolve(latest);
    };
    const onPaint = (
      _event: Electron.Event,
      _dirty: Electron.Rectangle,
      image: Electron.NativeImage,
    ): void => {
      latest = image;
      clearTimeout(quiet);
      quiet = setTimeout(settle, quietMs);
    };
    const limit = setTimeout(settle, settleLimitMs);
    contents.on('paint', onPaint);
    contents.invalidate();
  });
}
