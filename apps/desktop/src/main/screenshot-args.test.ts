import { describe, expect, it } from 'vitest';
import { parseScreenshotArgs } from './screenshot-args';

const base = [
  '/Vision',
  '--vision-screenshot',
  '/d/a.vis',
  '--artboard',
  'cart',
  '--out',
  '/tmp/a.png',
];

describe('parseScreenshotArgs', () => {
  it('ignores normal launches', () => {
    expect(parseScreenshotArgs(['/Vision', '/d/a.vis'])).toEqual({ kind: 'none' });
  });

  it('reads the request with scale 1 by default', () => {
    expect(parseScreenshotArgs(base)).toEqual({
      kind: 'request',
      request: { file: '/d/a.vis', artboard: 'cart', out: '/tmp/a.png', scale: 1 },
    });
  });

  it('accepts an app entry before the flags and a scale of 2', () => {
    expect(
      parseScreenshotArgs(['/Electron', 'apps/desktop', ...base.slice(1), '--scale', '2']),
    ).toEqual({
      kind: 'request',
      request: { file: '/d/a.vis', artboard: 'cart', out: '/tmp/a.png', scale: 2 },
    });
  });

  it.each([
    [
      ['/Vision', '--vision-screenshot', '/d/a.vis', '--out', '/tmp/a.png'],
      'Missing --artboard <id>',
    ],
    [
      ['/Vision', '--vision-screenshot', 'a.vis', '--artboard', 'x', '--out', '/tmp/a.png'],
      '--vision-screenshot needs an absolute .vis path, got "a.vis"',
    ],
    [
      ['/Vision', '--vision-screenshot', '/d/a.vis', '--artboard', 'x', '--out', '/tmp/a.jpg'],
      '--out needs an absolute .png path, got "/tmp/a.jpg"',
    ],
    [[...base, '--scale', '3'], '--scale must be 1 or 2, got "3"'],
    [
      ['/Vision', '--vision-screenshot', '--artboard', 'x', '--out', '/tmp/a.png'],
      'Missing --vision-screenshot <absolute .vis path>',
    ],
  ])('rejects %j', (argv, message) => {
    expect(parseScreenshotArgs(argv)).toEqual({ kind: 'invalid', message });
  });
});
