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
        { type: 'text', text: 'Artboard desktop at 1x.' },
        { type: 'image', data: onePixelPng.toString('base64'), mimeType: 'image/png' },
      ],
    });
  });

  it('returns the app error with how to fix it', async () => {
    await session.call('create_page', { file, name: 'Shop' });
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

  it('rejects a scale other than 1 or 2', async () => {
    expect(
      (await session.call('screenshot', { file, artboard: 'desktop', scale: 3 })).isError,
    ).toBe(true);
  });
});
