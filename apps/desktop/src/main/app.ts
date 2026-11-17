import { socketPath } from '@vision/activity/node';
import { app, BrowserWindow, Menu } from 'electron';
import { join } from 'node:path';
import { channels } from '../shared/channels';
import type { AgentActivity } from '../shared/contract';
import { ActivityServer } from './activity-server';
import { registerAppIpc } from './app-ipc';
import { AssetRegistry, handleAssetProtocol } from './asset-protocol';
import { Commands } from './commands';
import { launchPaths } from './launch-args';
import { buildMenu } from './menu';
import { handleAppProtocol } from './protocols';
import { RecentFiles } from './recent-files';
import { hardenSessions, hardenWebContents } from './security';
import { WindowRegistry } from './windows';

export function startApp(): void {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  let openPaths: ((paths: string[]) => void) | undefined;
  const pending: string[] = [];
  app.on('open-file', (event, path) => {
    event.preventDefault();
    if (openPaths === undefined) pending.push(path);
    else openPaths([path]);
  });
  app.on('second-instance', (_event, argv, workingDirectory) => {
    openPaths?.(launchPaths(argv, workingDirectory, process.defaultApp));
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  hardenWebContents();

  app
    .whenReady()
    .then(() => {
      hardenSessions();
      handleAppProtocol(join(__dirname, '../renderer'));
      const assets = new AssetRegistry();
      handleAssetProtocol(assets);

      const recent = new RecentFiles(join(app.getPath('userData'), 'recent-files.json'));
      const windows = new WindowRegistry(assets, () => {
        refreshMenu();
      });
      const commands = new Commands(windows, recent, () => {
        broadcastRecent(recent);
      });
      const report = (promise: Promise<void>): void => {
        promise.catch((error: unknown) => {
          console.error(error);
        });
      };
      const refreshMenu = (): void => {
        const focused = BrowserWindow.getFocusedWindow();
        Menu.setApplicationMenu(
          buildMenu({
            hasDesign: focused !== null && windows.pathOf(focused) !== null,
            run: (command) => {
              report(commands.run(command, BrowserWindow.getFocusedWindow() ?? undefined));
            },
          }),
        );
      };

      registerAppIpc(windows, commands, recent);
      listenForAgents(windows);
      refreshMenu();
      app.on('activate', () => {
        if (windows.windows().length === 0) windows.openWindow();
      });

      openPaths = (paths) => {
        if (paths.length === 0) commands.focusOrStart();
        else report(commands.openPaths(paths, undefined));
      };
      const initial = [...pending, ...launchPaths(process.argv, process.cwd(), process.defaultApp)];
      if (initial.length === 0) windows.openWindow();
      else openPaths(initial);
    })
    .catch((error: unknown) => {
      console.error('Vision failed to start:', error);
      app.exit(1);
    });
}

function listenForAgents(windows: WindowRegistry): void {
  ActivityServer.start(socketPath(), ({ session, agent, activity }, file) => {
    const update: AgentActivity = { session, agent, activity };
    windows.findByPath(file)?.webContents.send(channels.agentActivity, update);
  }).then(
    (server) => {
      app.once('will-quit', () => {
        server?.close().catch((error: unknown) => {
          console.error('Closing the agent activity socket failed:', error);
        });
      });
    },
    (error: unknown) => {
      console.error('Listening for agent activity failed:', error);
    },
  );
}

function broadcastRecent(recent: RecentFiles): void {
  recent
    .list()
    .then((files) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(channels.recentChanged, files);
      }
    })
    .catch((error: unknown) => {
      console.error('Listing recent files failed:', error);
    });
}
