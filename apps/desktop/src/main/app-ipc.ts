import { app, clipboard } from 'electron';
import { channels } from '../shared/channels';
import {
  appCommandSchema,
  clipboardTextSchema,
  pathSchema,
  selectionSchema,
} from '../shared/schemas';
import type { Commands } from './commands';
import { handle, handleWith } from './ipc';
import { resolveMcpServer } from './mcp-command';
import type { RecentFiles } from './recent-files';
import type { WindowRegistry } from './windows';

export function registerAppIpc(
  windows: WindowRegistry,
  commands: Commands,
  recent: RecentFiles,
): void {
  handle(channels.getState, (window) => windows.stateOf(window));
  handle(channels.listRecent, () => recent.list());
  handleWith(channels.removeRecent, pathSchema, (_window, path) => commands.removeRecent(path));
  handleWith(channels.openPath, pathSchema, (window, path) => commands.openPaths([path], window));
  handleWith(channels.runCommand, appCommandSchema, (window, command) =>
    commands.run(command, window),
  );
  handleWith(channels.setSelection, selectionSchema, (window, selection) => {
    windows.setSelection(window, selection);
  });
  handleWith(channels.writeClipboard, clipboardTextSchema, (_window, text) =>
    clipboard.writeText(text),
  );
  handle(channels.getMcpServer, () =>
    resolveMcpServer({
      isPackaged: app.isPackaged,
      execPath: process.execPath,
      resourcesPath: process.resourcesPath,
      appPath: app.getAppPath(),
    }),
  );
}
