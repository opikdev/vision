import { describe, expect, it, vi } from 'vitest';
import { appFile } from './protocols';

vi.mock('electron', () => ({}));

describe('appFile', () => {
  it.each([
    ['app://vision/index.html', '/r/index.html'],
    ['app://vision/assets/index-1.js', '/r/assets/index-1.js'],
    ['app://vision/a/../index.html', '/r/index.html'],
    ['app://vision/%69ndex.html', '/r/index.html'],
    ['app://vision/%2e%2e/secret.txt', '/r/secret.txt'],
  ])('serves %s from the renderer folder', (url, file) => {
    expect(appFile('/r', url)).toBe(file);
  });

  it.each([
    'app://other/index.html',
    'app://vision/..%2Fsecret.txt',
    'app://vision/%2E%2E%2F%2E%2E%2Fetc%2Fpasswd',
    'app://vision/..%5Csecret.txt',
  ])('refuses %s', (url) => {
    expect(appFile('/r', url)).toBeUndefined();
  });
});
