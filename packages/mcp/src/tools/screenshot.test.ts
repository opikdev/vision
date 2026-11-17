import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onePixelPng, writeFakeVision } from '../fake-vision';
import { useSession } from '../test-client';

const session = useSession();
let file: string;

beforeEach(async () => {
  file = join(session.dir, 'app.vis');
  vi.stubEnv('VISION_APP', await writeFakeVision(session.dir));
  vi.stubEnv('FAKE_VISION_LOG', join(session.dir, 'log.json'));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('screenshot', () => {
  it('returns the PNG as an image', async () => {
    await session.call('create_page', { file, name: 'Shop' });
    expect(
      await session.client.callTool({
        name: 'screenshot',
        arguments: { file, artboard: 'desktop' },
      }),
    ).toEqual({
      content: [
        { type: 'text', text: 'Artboard desktop at 1x (1440×900 → 1440×900).' },
        { type: 'image', data: onePixelPng.toString('base64'), mimeType: 'image/png' },
      ],
    });
  });

  it('scales a long artboard down to 2000 px and says so', async () => {
    await session.call('create_artboard', {
      file,
      id: 'landing',
      name: 'Landing',
      width: 1440,
      height: 9000,
    });
    expect((await session.call('screenshot', { file, artboard: 'landing', scale: 2 })).text).toBe(
      'Artboard landing at 0.22x (1440×9000 → 320×2000).\n[image]',
    );
    const { args } = JSON.parse(await readFile(join(session.dir, 'log.json'), 'utf8')) as {
      args: string[];
    };
    expect(args).toContain('--scale=0.2222222222222222');
  });

  it('rejects an artboard that does not exist', async () => {
    await session.call('create_page', { file, name: 'Shop' });
    expect(await session.call('screenshot', { file, artboard: 'cart' })).toEqual({
      text: 'No artboard has id "cart". Call get_overview to see the ids.',
      isError: true,
      structured: undefined,
    });
  });

  it('returns the app error with how to fix it', async () => {
    await session.call('create_artboard', {
      file,
      id: 'broken',
      name: 'Broken',
      width: 10,
      height: 10,
    });
    expect(await session.call('screenshot', { file, artboard: 'broken', scale: 2 })).toEqual({
      text: `Vision couldn't take the screenshot (exit code 1): No artboard has id "broken".\nTo use another build of Vision, set VISION_APP to its executable, and VISION_APP_ENTRY to its app folder for a development build.`,
      isError: true,
      structured: undefined,
    });
  });

  it('rejects a file that does not exist', async () => {
    expect(await session.call('screenshot', { file, artboard: 'desktop' })).toEqual({
      text: `${file} doesn't exist yet. Create an artboard first.`,
      isError: true,
      structured: undefined,
    });
  });

  it('rejects an artboard id that could be read as a switch', async () => {
    await session.call('create_page', { file, name: 'Shop' });
    expect((await session.call('screenshot', { file, artboard: '-no-sandbox' })).isError).toBe(
      true,
    );
    await expect(access(join(session.dir, 'log.json'))).rejects.toThrow('ENOENT');
  });

  it('rejects a scale other than 1 or 2', async () => {
    expect(
      (await session.call('screenshot', { file, artboard: 'desktop', scale: 3 })).isError,
    ).toBe(true);
  });
});
