import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRendererUrl, rendererUrl } from './renderer-url';

const electron = vi.hoisted(() => ({ app: { isPackaged: true } }));
vi.mock('electron', () => electron);

afterEach(() => {
  electron.app.isPackaged = true;
  vi.unstubAllEnvs();
});

describe('isRendererUrl', () => {
  it.each([
    ['app://vision/index.html', true],
    ['app://vision/index.html?mode=capture&artboard=cart', true],
    ['app://other/index.html', false],
    ['vision-asset://token/hero.png', false],
    ['https://example.com/', false],
    ['about:blank', false],
    ['not a url', false],
    ['http://localhost:5173/', false],
  ])('in the packaged app, %s is %s', (url, expected) => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://localhost:5173');
    expect(isRendererUrl(url)).toBe(expected);
  });

  it.each([
    ['http://localhost:5173/', true],
    ['http://localhost:5173/index.html?x=1', true],
    ['http://localhost:5174/', false],
    ['https://localhost:5173/', false],
    ['app://vision/index.html', true],
  ])('in development, %s is %s', (url, expected) => {
    electron.app.isPackaged = false;
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://localhost:5173');
    expect(isRendererUrl(url)).toBe(expected);
  });
});

describe('rendererUrl', () => {
  it('points at the bundled renderer with the search parameters', () => {
    expect(rendererUrl({ mode: 'capture', artboard: 'a b' })).toBe(
      'app://vision/index.html?mode=capture&artboard=a+b',
    );
  });
});
