import { assetsDirFor } from '@vision/format/node';
import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { channels } from '../shared/channels';
import type { DocumentState } from '../shared/contract';
import type { AssetRegistry } from './asset-protocol';
import { openDocumentSession, type DocumentSession } from './document-session';
import { rendererUrl } from './renderer-url';
import { secureWebPreferences } from './security';

const preloadPath = join(__dirname, '../preload/index.js');

interface Entry {
  path: string | null;
  session: DocumentSession | null;
  assetToken: string | null;
}

export function createBrowserWindow(
  options: Electron.BrowserWindowConstructorOptions,
  search: Record<string, string> = {},
  onLoadFailed: (error: unknown) => void = logLoadFailure,
): BrowserWindow {
  const window = new BrowserWindow({
    ...options,
    backgroundColor: '#1C1C1C',
    webPreferences: secureWebPreferences(preloadPath),
  });
  window.loadURL(rendererUrl(search)).catch(onLoadFailed);
  return window;
}

function logLoadFailure(error: unknown): void {
  console.error('Loading the window failed:', error);
}

export class WindowRegistry {
  readonly #entries = new Map<BrowserWindow, Entry>();
  readonly #assets: AssetRegistry;
  readonly #onChange: () => void;

  constructor(assets: AssetRegistry, onChange: () => void) {
    this.#assets = assets;
    this.#onChange = onChange;
  }

  openWindow(): BrowserWindow {
    const window = createBrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 800,
      minHeight: 560,
      show: false,
      title: app.getName(),
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 18, y: 17 },
    });
    this.#entries.set(window, { path: null, session: null, assetToken: null });
    window.once('ready-to-show', () => {
      window.show();
    });
    window.on('focus', this.#onChange);
    window.once('closed', () => {
      this.#release(window);
      this.#onChange();
    });
    return window;
  }

  windows(): BrowserWindow[] {
    return [...this.#entries.keys()];
  }

  findByPath(path: string): BrowserWindow | undefined {
    return this.windows().find((window) => this.#entries.get(window)?.path === path);
  }

  pathOf(window: BrowserWindow): string | null {
    return this.#entries.get(window)?.path ?? null;
  }

  stateOf(window: BrowserWindow): DocumentState | null {
    return this.#entries.get(window)?.session?.state() ?? null;
  }

  async attach(window: BrowserWindow, path: string): Promise<void> {
    const assetToken = this.#assets.register(assetsDirFor(path));
    let session: DocumentSession;
    try {
      session = await openDocumentSession({
        path,
        assetToken,
        onChange: (state) => {
          if (!window.isDestroyed()) window.webContents.send(channels.state, state);
        },
      });
    } catch (error) {
      this.#assets.unregister(assetToken);
      throw error;
    }
    const entry = this.#entries.get(window);
    if (entry === undefined || window.isDestroyed()) {
      this.#assets.unregister(assetToken);
      await session.close();
      return;
    }
    entry.path = path;
    entry.assetToken = assetToken;
    entry.session = session;
    window.setTitle(session.state().name);
    window.setRepresentedFilename(path);
    window.webContents.send(channels.state, session.state());
    this.#onChange();
  }

  #release(window: BrowserWindow): void {
    const entry = this.#entries.get(window);
    this.#entries.delete(window);
    if (entry?.assetToken != null) this.#assets.unregister(entry.assetToken);
    entry?.session?.close().catch((error: unknown) => {
      console.error(`Closing the watcher for ${entry.path ?? 'a window'} failed:`, error);
    });
  }
}
