import { describe, expect, it } from 'vitest';
import { resolveMcpServer } from './mcp-command';

describe('resolveMcpServer', () => {
  it('runs the bundled server with the app binary when packaged', () => {
    expect(
      resolveMcpServer({
        isPackaged: true,
        execPath: '/Applications/Vision.app/Contents/MacOS/Vision',
        resourcesPath: '/Applications/Vision.app/Contents/Resources',
        appPath: '/Applications/Vision.app/Contents/Resources/app.asar',
      }),
    ).toEqual({
      command: '/Applications/Vision.app/Contents/MacOS/Vision',
      args: ['/Applications/Vision.app/Contents/Resources/mcp/vision-mcp.mjs'],
      env: { ELECTRON_RUN_AS_NODE: '1' },
    });
  });

  it('runs the workspace build with node in development', () => {
    expect(
      resolveMcpServer({
        isPackaged: false,
        execPath: '/repo/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
        resourcesPath: '/repo/node_modules/electron/dist/Electron.app/Contents/Resources',
        appPath: '/repo/apps/desktop',
      }),
    ).toEqual({
      command: 'node',
      args: ['/repo/packages/mcp/dist/vision-mcp.mjs'],
      env: {},
    });
  });
});
