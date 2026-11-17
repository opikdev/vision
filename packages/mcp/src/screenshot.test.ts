import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onePixelPng, writeFakeVision } from './fake-vision';
import {
  resolveApp,
  ScreenshotError,
  screenshotSize,
  takeScreenshot,
  type Runtime,
} from './screenshot';

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

describe('screenshotSize', () => {
  it.each([
    [1440, 900, 1, { scale: 1, width: 1440, height: 900 }],
    [800, 600, 2, { scale: 2, width: 1600, height: 1200 }],
    [1440, 900, 2, { scale: 2000 / 1440, width: 2000, height: 1250 }],
    [1000, 2000, 2, { scale: 1, width: 1000, height: 2000 }],
    [1440, 9000, 1, { scale: 2000 / 9000, width: 320, height: 2000 }],
    [1440, 9000, 2, { scale: 2000 / 9000, width: 320, height: 2000 }],
    [10000, 1, 1, { scale: 0.2, width: 2000, height: 1 }],
  ])('fits %ix%i at %ix', (width, height, requested, size) => {
    expect(screenshotSize(width, height, requested)).toEqual(size);
  });
});

describe('takeScreenshot', () => {
  let dir: string;
  let log: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vision-mcp-shot-'));
    log = join(dir, 'log.json');
    vi.stubEnv('FAKE_VISION_LOG', log);
    vi.stubEnv('ELECTRON_RUN_AS_NODE', '1');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  async function logged(): Promise<{ args: string[]; electronRunAsNode: string | null }> {
    return JSON.parse(await readFile(log, 'utf8')) as {
      args: string[];
      electronRunAsNode: string | null;
    };
  }

  it('runs the app with the screenshot arguments and returns the PNG', async () => {
    const fake = await writeFakeVision(dir);
    const png = await takeScreenshot(
      { command: process.execPath, args: [fake] },
      { file: '/designs/app.vis', artboard: 'cart', scale: 2 },
    );
    expect(png).toEqual(onePixelPng);
    const { args, electronRunAsNode } = await logged();
    const out = args[2]?.slice('--out='.length) ?? '';
    expect(args).toEqual([
      '--vision-screenshot=/designs/app.vis',
      '--artboard=cart',
      `--out=${out}`,
      '--scale=2',
    ]);
    expect(out).toMatch(/vision-screenshot-[^/]+\/screenshot\.png$/);
    expect(electronRunAsNode).toBeNull();
    await expect(access(out)).rejects.toThrow('ENOENT');
  });

  it('runs an executable script directly', async () => {
    const fake = await writeFakeVision(dir);
    const png = await takeScreenshot(
      { command: fake, args: [] },
      { file: '/designs/app.vis', artboard: 'cart', scale: 1 },
    );
    expect(png).toEqual(onePixelPng);
  });

  it("reports the app's error output", async () => {
    const fake = await writeFakeVision(dir);
    await expect(
      takeScreenshot(
        { command: process.execPath, args: [fake] },
        { file: '/designs/app.vis', artboard: 'broken', scale: 1 },
      ),
    ).rejects.toThrow(
      new ScreenshotError(
        `Vision couldn't take the screenshot (exit code 1): No artboard has id "broken".`,
      ),
    );
  });

  it('reports a run that writes no PNG', async () => {
    const fake = await writeFakeVision(dir);
    await expect(
      takeScreenshot(
        { command: process.execPath, args: [fake] },
        { file: '/designs/app.vis', artboard: 'silent', scale: 1 },
      ),
    ).rejects.toThrow(new ScreenshotError('Vision exited without writing the PNG.'));
  });

  it('reports an app that cannot start', async () => {
    const missing = join(dir, 'no-such-app');
    await expect(
      takeScreenshot(
        { command: missing, args: [] },
        { file: '/designs/app.vis', artboard: 'cart', scale: 1 },
      ),
    ).rejects.toThrow(
      new ScreenshotError(`Couldn't start Vision at ${missing}: spawn ${missing} ENOENT`),
    );
  });
});
