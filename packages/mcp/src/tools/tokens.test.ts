import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '../test-client';

const session = useSession();
let file: string;

beforeEach(() => {
  file = join(session.dir, 'app.vis');
});

describe('set_tokens', () => {
  it('merges tokens and deletes those set to null', async () => {
    await session.call('set_tokens', {
      file,
      tokens: { color: { brand: '#1F3D2B', old: 'red' }, radius: { card: '12px' } },
    });
    expect(
      await session.call('set_tokens', { file, tokens: { color: { old: null, fg: '#111' } } }),
    ).toEqual({
      text: 'Tokens are now color: brand, fg; radius: card.',
      isError: false,
      structured: undefined,
    });
    expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({
      tokens: { color: { brand: '#1F3D2B', fg: '#111' }, radius: { card: '12px' } },
    });
  });

  it('makes token classes known', async () => {
    await session.call('set_tokens', { file, tokens: { color: { brand: '#1F3D2B' } } });
    const result = await session.call('write_html', {
      file,
      parent: 'desktop',
      html: '<p class="text-brand rounded-card">x</p>',
    });
    expect(result.text).toBe(
      [
        'Added 1 node to desktop:',
        'text p-1 class="text-brand rounded-card" text="x"',
        '',
        'New warnings:',
        '- warning unknown-class at pages[0].artboards[0].children[0].class: Unknown class "rounded-card". Did you mean `rounded-b-md`?',
      ].join('\n'),
    );
  });

  it('rejects an invalid value', async () => {
    expect(
      await session.call('set_tokens', { file, tokens: { radius: { card: '12' } } }),
    ).toMatchObject({ isError: true });
    await expect(readFile(file, 'utf8')).rejects.toThrow('ENOENT');
  });

  it('rejects an unknown group', async () => {
    expect(
      (await session.call('set_tokens', { file, tokens: { colour: { brand: 'red' } } })).isError,
    ).toBe(true);
  });
});
