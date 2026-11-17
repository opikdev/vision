import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveAssetFile } from './assets';

let root: string;
let assets: string;

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'vision-assets-')));
  assets = join(root, 'checkout.assets');
  await mkdir(join(assets, 'photos'), { recursive: true });
  await writeFile(join(assets, 'photos', 'hero shot.jpg'), 'jpg');
  await writeFile(join(assets, 'notes.txt'), 'text');
  await writeFile(join(root, 'secret.png'), 'png');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('resolveAssetFile', () => {
  it('resolves an encoded path inside the assets folder', async () => {
    expect(await resolveAssetFile(assets, '/photos/hero%20shot.jpg')).toBe(
      join(assets, 'photos', 'hero shot.jpg'),
    );
  });

  it('returns nothing for a file that does not exist', async () => {
    expect(await resolveAssetFile(assets, '/photos/missing.jpg')).toBeUndefined();
    expect(await resolveAssetFile(join(root, 'nope.assets'), '/a.png')).toBeUndefined();
  });

  it('rejects traversal, including encoded separators', async () => {
    expect(await resolveAssetFile(assets, '/../secret.png')).toBeUndefined();
    expect(await resolveAssetFile(assets, '/%2E%2E/secret.png')).toBeUndefined();
    expect(await resolveAssetFile(assets, '/photos/..%2F..%2Fsecret.png')).toBeUndefined();
    expect(await resolveAssetFile(assets, '/%E0%A4%A')).toBeUndefined();
  });

  it('rejects files that are not images', async () => {
    expect(await resolveAssetFile(assets, '/notes.txt')).toBeUndefined();
  });

  it('rejects symlinks that point outside the assets folder', async () => {
    await symlink(join(root, 'secret.png'), join(assets, 'escape.png'));
    expect(await resolveAssetFile(assets, '/escape.png')).toBeUndefined();
  });

  it('rejects image-named symlinks to other file types', async () => {
    await symlink(join(assets, 'notes.txt'), join(assets, 'fake.png'));
    expect(await resolveAssetFile(assets, '/fake.png')).toBeUndefined();
  });

  it('follows symlinks that stay inside the assets folder', async () => {
    await symlink(join(assets, 'photos', 'hero shot.jpg'), join(assets, 'alias.jpg'));
    expect(await resolveAssetFile(assets, '/alias.jpg')).toBe(
      join(assets, 'photos', 'hero shot.jpg'),
    );
  });
});
