import { describe, expect, it } from 'vitest';
import { launchPaths } from './launch-args';

describe('launchPaths', () => {
  it('skips the executable and, in development, the app entry', () => {
    expect(launchPaths(['/Electron', '.', '/a/one.vis'], '/cwd', true)).toEqual(['/a/one.vis']);
    expect(launchPaths(['/Vision', '/a/one.vis'], '/cwd', false)).toEqual(['/a/one.vis']);
  });

  it('resolves relative paths against the working directory', () => {
    expect(launchPaths(['/Vision', 'designs/two.VIS'], '/home/me', false)).toEqual([
      '/home/me/designs/two.VIS',
    ]);
  });

  it('ignores switches and files that are not designs', () => {
    expect(
      launchPaths(
        [
          '/Electron',
          'apps/desktop',
          '--inspect=5858',
          '--allow-file-access',
          'notes.txt',
          '/x.vis',
        ],
        '/cwd',
        true,
      ),
    ).toEqual(['/x.vis']);
  });

  it('returns nothing when no design was passed', () => {
    expect(launchPaths(['/Vision'], '/cwd', false)).toEqual([]);
    expect(launchPaths(['/Electron', 'design.vis'], '/cwd', true)).toEqual([]);
  });
});
