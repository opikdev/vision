import { app, dialog, type BrowserWindow } from 'electron';
import { join } from 'node:path';

const visFilter = { name: 'Vision design', extensions: ['vis'] };

export async function chooseNewDesignPath(
  parent: BrowserWindow | undefined,
): Promise<string | undefined> {
  const options: Electron.SaveDialogOptions = {
    title: 'New design',
    buttonLabel: 'Create',
    defaultPath: join(app.getPath('documents'), 'Untitled.vis'),
    filters: [visFilter],
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  };
  const result = await (parent
    ? dialog.showSaveDialog(parent, options)
    : dialog.showSaveDialog(options));
  if (result.canceled || result.filePath === '') return undefined;
  return result.filePath.endsWith('.vis') ? result.filePath : `${result.filePath}.vis`;
}

export async function chooseDesignsToOpen(parent: BrowserWindow | undefined): Promise<string[]> {
  const options: Electron.OpenDialogOptions = {
    title: 'Open',
    filters: [visFilter],
    properties: ['openFile', 'multiSelections'],
  };
  const result = await (parent
    ? dialog.showOpenDialog(parent, options)
    : dialog.showOpenDialog(options));
  return result.canceled ? [] : result.filePaths;
}

export async function showError(
  parent: BrowserWindow | undefined,
  message: string,
  detail: string,
): Promise<void> {
  const options: Electron.MessageBoxOptions = { type: 'error', message, detail, buttons: ['OK'] };
  await (parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options));
}
