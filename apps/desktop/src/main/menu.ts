import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';
import { channels } from '../shared/channels';
import type { AppCommand, ViewCommand } from '../shared/contract';

export interface MenuContext {
  hasDesign: boolean;
  run: (command: AppCommand) => void;
}

export function buildMenu({ hasDesign, run }: MenuContext): Menu {
  const command = (
    label: string,
    name: AppCommand,
    accelerator?: string,
  ): MenuItemConstructorOptions => ({
    label,
    ...(accelerator === undefined ? {} : { accelerator }),
    click: () => {
      run(name);
    },
  });
  const view = (
    label: string,
    name: ViewCommand,
    accelerator?: string,
    enabled = hasDesign,
  ): MenuItemConstructorOptions => ({
    label,
    ...(accelerator === undefined ? {} : { accelerator, registerAccelerator: false }),
    enabled,
    click: () => {
      BrowserWindow.getFocusedWindow()?.webContents.send(channels.viewCommand, name);
    },
  });
  const development: MenuItemConstructorOptions[] = app.isPackaged
    ? []
    : [{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }];

  return Menu.buildFromTemplate([
    {
      role: 'appMenu',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: `Quit ${app.getName()}` },
      ],
    },
    {
      label: 'File',
      submenu: [
        command('New design…', 'new-design', 'CommandOrControl+N'),
        command('Open…', 'open', 'CommandOrControl+O'),
        {
          label: 'Open Recent',
          role: 'recentDocuments',
          submenu: [{ label: 'Clear Menu', role: 'clearRecentDocuments' }],
        },
        { type: 'separator' },
        {
          ...command('Show in Finder', 'show-in-finder', 'Alt+CommandOrControl+R'),
          enabled: hasDesign,
        },
        { ...command('Copy file path', 'copy-path'), enabled: hasDesign },
        view('Connect an AI…', 'connect-ai', undefined, true),
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        view('Toggle sidebar', 'toggle-sidebar', 'CommandOrControl+\\', true),
        { type: 'separator' },
        view('Zoom in', 'zoom-in', 'CommandOrControl+='),
        view('Zoom out', 'zoom-out', 'CommandOrControl+-'),
        view('Actual size', 'zoom-reset', 'CommandOrControl+0'),
        view('Zoom to fit', 'zoom-fit', 'Shift+1'),
        view('Zoom to layer', 'zoom-layer', 'Shift+2'),
        ...development,
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ]);
}
