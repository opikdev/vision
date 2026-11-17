import { createDocument } from '@vision/format';
import { isMissingFileError, writeDesign } from '@vision/format/node';
import { app, BrowserWindow, clipboard, shell } from 'electron';
import { realpath, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute } from 'node:path';
import type { AppCommand } from '../shared/contract';
import { chooseDesignsToOpen, chooseNewDesignPath, showError } from './dialogs';
import { errorMessage } from './errors';
import type { RecentFiles } from './recent-files';
import type { WindowRegistry } from './windows';

export class Commands {
  readonly #windows: WindowRegistry;
  readonly #recent: RecentFiles;
  readonly #onRecentChanged: () => void;

  constructor(windows: WindowRegistry, recent: RecentFiles, onRecentChanged: () => void) {
    this.#windows = windows;
    this.#recent = recent;
    this.#onRecentChanged = onRecentChanged;
  }

  async run(command: AppCommand, from: BrowserWindow | undefined): Promise<void> {
    const path = from === undefined ? null : this.#windows.pathOf(from);
    switch (command) {
      case 'new-design':
        await this.newDesign(from);
        return;
      case 'open':
        await this.open(from);
        return;
      case 'show-in-finder':
        if (path !== null) shell.showItemInFolder(path);
        return;
      case 'copy-path':
        if (path !== null) await clipboard.writeText(path);
        return;
      case 'quit':
        app.quit();
        return;
    }
  }

  async newDesign(from: BrowserWindow | undefined): Promise<void> {
    const path = await chooseNewDesignPath(from);
    if (path === undefined) return;
    try {
      await writeDesign(path, createDocument());
    } catch (error) {
      await showError(from, `Couldn't create ${basename(path)}`, errorMessage(error));
      return;
    }
    await this.openPaths([path], from);
  }

  async open(from: BrowserWindow | undefined): Promise<void> {
    await this.openPaths(await chooseDesignsToOpen(from), from);
  }

  async openPaths(paths: readonly string[], from: BrowserWindow | undefined): Promise<void> {
    for (const path of paths) await this.#openPath(path, from);
  }

  async removeRecent(path: string): Promise<void> {
    await this.#recent.remove(path);
    this.#onRecentChanged();
  }

  focusOrStart(): void {
    const window = BrowserWindow.getFocusedWindow() ?? this.#windows.windows().at(-1);
    if (window === undefined) this.#windows.openWindow();
    else focus(window);
  }

  async #openPath(path: string, from: BrowserWindow | undefined): Promise<void> {
    try {
      await this.#openChecked(await checkDesignPath(path), from);
    } catch (error) {
      await showError(from, `Couldn't open ${basename(path)}`, errorMessage(error));
    }
  }

  async #openChecked(path: string, from: BrowserWindow | undefined): Promise<void> {
    const open = this.#windows.findByPath(path);
    if (open !== undefined) {
      focus(open);
      return;
    }
    const window = this.#startWindowFor(from) ?? this.#windows.openWindow();
    await this.#windows.attach(window, path);
    focus(window);
    app.addRecentDocument(path);
    await this.#recent.add(path);
    this.#onRecentChanged();
  }

  #startWindowFor(from: BrowserWindow | undefined): BrowserWindow | undefined {
    const isStart = (window: BrowserWindow): boolean => this.#windows.pathOf(window) === null;
    if (from !== undefined && isStart(from)) return from;
    const all = this.#windows.windows();
    return all.length === 1 && all[0] !== undefined && isStart(all[0]) ? all[0] : undefined;
  }
}

async function checkDesignPath(path: string): Promise<string> {
  if (!isAbsolute(path) || extname(path).toLowerCase() !== '.vis') {
    throw new Error(`${path} isn't a .vis design file.`);
  }
  let real: string;
  try {
    real = await realpath(path);
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new Error(`${path} doesn't exist. It may have been moved or deleted.`, {
        cause: error,
      });
    }
    throw error;
  }
  if (!(await stat(real)).isFile()) throw new Error(`${path} is a folder, not a design file.`);
  return real;
}

function focus(window: BrowserWindow): void {
  if (window.isMinimized()) window.restore();
  if (window.isVisible()) window.focus();
}
