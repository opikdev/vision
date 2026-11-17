import { formatDiagnostic, type VisionDocument } from '@vision/format';
import { assetsDirFor, readDesign } from '@vision/format/node';
import { app } from 'electron';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { channels } from '../shared/channels';
import type { DocumentState } from '../shared/contract';
import { AssetRegistry, handleAssetProtocol } from './asset-protocol';
import { errorMessage } from './errors';
import { handle } from './ipc';
import { handleAppProtocol } from './protocols';
import { sanitizeDocument } from './sanitize-document';
import { createScreenshotProfile } from './screenshot-profile';
import { hardenSessions, hardenWebContents } from './security';

export function failHeadless(message: string): void {
  process.stderr.write(`${message.replace(/\s*\n\s*/g, ' ')}\n`);
  app.exit(1);
}

/** Runs `task` without a dock icon or visible window, then exits: 0 when it resolves, 1 when it fails. */
export function runHeadless(task: () => Promise<void>): void {
  let finished = false;
  const finish = (error?: unknown): void => {
    if (finished) return;
    finished = true;
    if (error === undefined) app.exit(0);
    else failHeadless(errorMessage(error));
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
    .then(task)
    .then(() => {
      finish();
    }, finish);
}

export async function loadDesign(file: string): Promise<VisionDocument> {
  const { exists, result } = await readDesign(file);
  if (!exists) throw new Error(`File not found: ${file}`);
  if (!result.ok) {
    const [first] = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    throw new Error(
      `${file} has errors: ${first === undefined ? 'unknown' : formatDiagnostic(first)}`,
    );
  }
  return result.document;
}

/** Serves the renderer, its assets and the design, as the app does for a window. */
export function serveDesign(file: string, document: VisionDocument): void {
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
    document: sanitizeDocument(document),
    diagnostics: [],
    readError: null,
    mtimeMs: null,
    assetToken: assets.register(assetsDirFor(file)),
    assetsVersion: 0,
  };
  handle(channels.getState, () => state);
}

export function deadline(
  timeoutMs: number,
  what: string,
): { expired: Promise<never>; clear(): void } {
  const { promise: expired, reject } = Promise.withResolvers<never>();
  const timer = setTimeout(() => {
    reject(new Error(`Timed out after ${timeoutMs / 1000} s waiting for ${what}`));
  }, timeoutMs);
  return {
    expired,
    clear: () => {
      clearTimeout(timer);
    },
  };
}
