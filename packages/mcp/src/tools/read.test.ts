import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '../test-client';

const session = useSession();
let file: string;

const design = {
  format: 'vision',
  version: 1,
  tokens: { color: { brand: '#1F3D2B', fg: '#1C1C1A' }, radius: { card: '12px' } },
  pages: [
    {
      id: 'shop',
      name: 'Shop',
      artboards: [
        {
          id: 'cart',
          name: 'Cart',
          x: 0,
          y: 0,
          width: 1440,
          height: 900,
          class: 'bg-white',
          children: [
            {
              type: 'frame',
              id: 'summary',
              class: 'flex flex-col gap-2',
              children: [{ type: 'text', id: 'title', class: 'text-2xl text-brand', text: 'Cart' }],
            },
            { type: 'image', id: 'hero', src: 'hero.jpg', alt: 'Plants' },
          ],
        },
      ],
    },
    { id: 'empty', name: 'Empty', artboards: [] },
  ],
};

beforeEach(async () => {
  file = join(session.dir, 'shop.vis');
  await writeFile(file, JSON.stringify(design));
});

describe('get_guide', () => {
  it('returns docs/format.md verbatim', async () => {
    const guide = await readFile(new URL('../../../../docs/format.md', import.meta.url), 'utf8');
    const result = await session.call('get_guide', { file });
    expect(result.text).toBe(guide);
    expect(result.text.startsWith('# The `.vis` format\n')).toBe(true);
  });
});

describe('get_overview', () => {
  it('summarises pages, artboards, tokens and problems', async () => {
    expect((await session.call('get_overview', { file })).text).toBe(
      [
        file,
        '',
        'Pages:',
        '- page shop "Shop"',
        '  - artboard cart "Cart" 1440x900 at 0,0',
        '- page empty "Empty"',
        '',
        'Tokens:',
        '- color: brand, fg',
        '- radius: card',
        '',
        'Problems: 0 errors, 1 warning. Call validate for details.',
      ].join('\n'),
    );
  });

  it('says how a missing file will be created', async () => {
    const missing = join(session.dir, 'new.vis');
    expect(await session.call('get_overview', { file: missing })).toEqual({
      text: `${missing} doesn't exist yet. The first edit creates it with page "page-1" and a 1440x900 artboard "desktop".`,
      isError: false,
      structured: undefined,
    });
  });

  it('lists the errors of an invalid file', async () => {
    await writeFile(file, '{ "format": "vision", }');
    expect((await session.call('get_overview', { file })).text).toBe(
      `${file} has errors, so it can't be read until they're fixed:\n- error json-syntax at line 1, (document): Trailing comma. Remove the comma before the closing bracket.`,
    );
  });
});

describe('get_tree', () => {
  it('outlines the whole design', async () => {
    expect((await session.call('get_tree', { file })).text).toBe(
      [
        'page shop name="Shop"',
        '  artboard cart name="Cart" 1440x900 at 0,0 class="bg-white"',
        '    frame summary class="flex flex-col gap-2"',
        '      text title class="text-2xl text-brand" text="Cart"',
        '    image hero src="hero.jpg" alt="Plants"',
        'page empty name="Empty"',
      ].join('\n'),
    );
  });

  it('outlines one frame', async () => {
    expect((await session.call('get_tree', { file, id: 'summary' })).text).toBe(
      'frame summary class="flex flex-col gap-2"\n  text title class="text-2xl text-brand" text="Cart"',
    );
  });

  it('rejects an unknown id', async () => {
    expect(await session.call('get_tree', { file, id: 'nope' })).toEqual({
      text: 'No page, artboard or node has id "nope". Call get_tree to see the ids.',
      isError: true,
      structured: undefined,
    });
  });
});

describe('get_node', () => {
  it('returns a node as JSON', async () => {
    expect(JSON.parse((await session.call('get_node', { file, id: 'summary' })).text)).toEqual({
      type: 'frame',
      id: 'summary',
      class: 'flex flex-col gap-2',
      children: [{ type: 'text', id: 'title', class: 'text-2xl text-brand', text: 'Cart' }],
    });
  });

  it('returns a page as JSON', async () => {
    expect(JSON.parse((await session.call('get_node', { file, id: 'empty' })).text)).toEqual({
      id: 'empty',
      name: 'Empty',
      artboards: [],
    });
  });

  it('rejects an unknown id', async () => {
    expect((await session.call('get_node', { file, id: 'cartt' })).isError).toBe(true);
  });

  it('rejects an invalid file', async () => {
    await writeFile(file, '[]');
    expect(await session.call('get_node', { file, id: 'cart' })).toEqual({
      text: `${file} has errors, so it can't be read until they're fixed:\n- error schema at line 1, (document): The document must be an object, not an array.`,
      isError: true,
      structured: undefined,
    });
  });
});
