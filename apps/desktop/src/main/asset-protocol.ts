import { net, protocol } from 'electron';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolveAssetFile } from './assets';

export class AssetRegistry {
  readonly #dirs = new Map<string, string>();

  register(assetsDir: string): string {
    const token = randomUUID();
    this.#dirs.set(token, assetsDir);
    return token;
  }

  unregister(token: string): void {
    this.#dirs.delete(token);
  }

  dirFor(token: string): string | undefined {
    return this.#dirs.get(token);
  }
}

export function handleAssetProtocol(registry: AssetRegistry): void {
  protocol.handle('vision-asset', async (request) => {
    const url = new URL(request.url);
    const dir = registry.dirFor(url.host);
    const file = dir === undefined ? undefined : await resolveAssetFile(dir, url.pathname);
    if (file === undefined) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}
