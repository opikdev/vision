import { app } from 'electron';

const appHost = 'vision';

function devServerUrl(): string | undefined {
  return app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL;
}

export function rendererUrl(search: Record<string, string> = {}): string {
  const url = new URL(devServerUrl() ?? `app://${appHost}/index.html`);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, value);
  return url.toString();
}

export function devServerOrigin(): string | undefined {
  const url = devServerUrl();
  return url === undefined ? undefined : new URL(url).origin;
}

export function isRendererUrl(url: string): boolean {
  if (!URL.canParse(url)) return false;
  const parsed = new URL(url);
  if (parsed.protocol === 'app:') return parsed.host === appHost;
  return parsed.origin === devServerOrigin();
}
