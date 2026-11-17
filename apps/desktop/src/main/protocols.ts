import { net, protocol } from 'electron';
import { join, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contentSecurityPolicy } from './security';

export function registerPrivilegedSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true },
    },
    { scheme: 'vision-asset', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
}

export function handleAppProtocol(rendererDir: string): void {
  protocol.handle('app', async (request) => {
    const { host, pathname } = new URL(request.url);
    const file = join(rendererDir, decodeURIComponent(pathname));
    const inside = relative(rendererDir, file);
    if (host !== 'vision' || inside.startsWith('..') || isAbsolute(inside)) {
      return new Response('Not found', { status: 404 });
    }
    const response = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', contentSecurityPolicy(undefined));
    return new Response(response.body, { status: response.status, headers });
  });
}
