import { describe, expect, it, vi } from 'vitest';
import { resolveApp, type Runtime } from './vision-app';

function runtime(overrides: Partial<Runtime> = {}): Runtime {
  return {
    env: {},
    execPath: '/usr/local/bin/node',
    electron: undefined,
    platform: 'darwin',
    exists: () => false,
    ...overrides,
  };
}

describe('resolveApp', () => {
  it('uses VISION_APP first, with VISION_APP_ENTRY as the first argument', () => {
    expect(
      resolveApp(
        runtime({
          env: {
            VISION_APP: '/dev/electron',
            VISION_APP_ENTRY: '/dev/vision',
            ELECTRON_RUN_AS_NODE: '1',
          },
          electron: '45.2.2',
          exists: () => true,
        }),
      ),
    ).toEqual({ command: '/dev/electron', args: ['/dev/vision'] });
  });

  it('uses VISION_APP alone when there is no entry', () => {
    expect(resolveApp(runtime({ env: { VISION_APP: '/opt/Vision' } }))).toEqual({
      command: '/opt/Vision',
      args: [],
    });
  });

  it('uses its own binary when it runs inside the packaged app', () => {
    expect(
      resolveApp(
        runtime({
          env: { ELECTRON_RUN_AS_NODE: '1' },
          execPath: '/Applications/Vision.app/Contents/MacOS/Vision',
          electron: '45.2.2',
        }),
      ),
    ).toEqual({ command: '/Applications/Vision.app/Contents/MacOS/Vision', args: [] });
  });

  it('ignores ELECTRON_RUN_AS_NODE under plain Node', () => {
    expect(resolveApp(runtime({ env: { ELECTRON_RUN_AS_NODE: '1' } }))).toBeUndefined();
  });

  it('falls back to the app in /Applications on macOS', () => {
    const exists = vi.fn(
      (path: string) => path === '/Applications/Vision.app/Contents/MacOS/Vision',
    );
    expect(resolveApp(runtime({ exists }))).toEqual({
      command: '/Applications/Vision.app/Contents/MacOS/Vision',
      args: [],
    });
  });

  it('finds nothing elsewhere', () => {
    expect(resolveApp(runtime({ platform: 'linux', exists: () => true }))).toBeUndefined();
  });
});
