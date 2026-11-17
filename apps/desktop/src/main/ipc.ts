import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { z } from 'zod';
import { isRendererUrl } from './renderer-url';

export function handle<Result>(
  channel: string,
  handler: (window: BrowserWindow) => Result | Promise<Result>,
): void {
  ipcMain.handle(channel, (event) => handler(trustedSender(event, channel)));
}

export function handleWith<Schema extends z.ZodType, Result>(
  channel: string,
  schema: Schema,
  handler: (window: BrowserWindow, payload: z.output<Schema>) => Result | Promise<Result>,
): void {
  ipcMain.handle(channel, (event, payload: unknown) =>
    handler(trustedSender(event, channel), schema.parse(payload)),
  );
}

function trustedSender(event: IpcMainInvokeEvent, channel: string): BrowserWindow {
  const frame = event.senderFrame;
  if (frame === null) throw new Error(`Refused ${channel} from a closed frame`);
  if (frame.parent !== null || !isRendererUrl(frame.url)) {
    throw new Error(`Refused ${channel} from ${frame.url}`);
  }
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window === null) throw new Error(`Refused ${channel} from a window Vision didn't open`);
  return window;
}
