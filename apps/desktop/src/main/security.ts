import { app, session, type WebContents, type WebPreferences } from 'electron';
import { devServerOrigin } from './renderer-url';

export function contentSecurityPolicy(devOrigin: string | undefined): string {
  const dev = devOrigin === undefined ? '' : ` ${devOrigin}`;
  const devScripts = devOrigin === undefined ? '' : ` 'unsafe-inline'${dev}`;
  const devConnect = devOrigin === undefined ? '' : `; connect-src 'self'${dev} ws://localhost:*`;
  return (
    [
      `default-src 'self'${dev}`,
      `script-src 'self'${devScripts}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' vision-asset: https: data: blob:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join('; ') + devConnect
  );
}

export function secureWebPreferences(preload: string): WebPreferences {
  return {
    preload,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
    webviewTag: false,
    spellcheck: false,
  };
}

export function hardenSessions(): void {
  const devOrigin = devServerOrigin();
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  ses.setPermissionCheckHandler(() => false);
  if (devOrigin !== undefined) {
    ses.webRequest.onHeadersReceived({ urls: [`${devOrigin}/*`] }, (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [contentSecurityPolicy(devOrigin)],
        },
      });
    });
  }
}

export function hardenWebContents(): void {
  app.on('web-contents-created', (_event, contents) => {
    blockNavigation(contents);
  });
}

function blockNavigation(contents: WebContents): void {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  contents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame || event.url !== 'about:blank') event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
}
