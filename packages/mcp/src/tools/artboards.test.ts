import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '../test-client';

const session = useSession();
let file: string;

beforeEach(() => {
  file = join(session.dir, 'app.vis');
});

async function saved(): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8'));
}

describe('create_page', () => {
  it('creates the file with a new page', async () => {
    expect(await session.call('create_page', { file, name: 'Checkout' })).toEqual({
      text: `Created ${file} with page "page-1" and artboard "desktop".\nAdded page checkout-1 "Checkout".`,
      isError: false,
      structured: { id: 'checkout-1' },
    });
    expect(await saved()).toMatchObject({
      pages: [{ id: 'page-1' }, { id: 'checkout-1', name: 'Checkout', artboards: [] }],
    });
  });

  it('rejects an id that is already used', async () => {
    expect(await session.call('create_page', { file, name: 'Again', id: 'page-1' })).toEqual({
      text: 'The id "page-1" is already used. Choose another id or leave it out.',
      isError: true,
      structured: undefined,
    });
  });
});

describe('create_artboard', () => {
  it('places the artboard right of the others', async () => {
    await session.call('create_page', { file, name: 'Checkout' });
    expect(
      await session.call('create_artboard', {
        file,
        name: 'Cart, mobile',
        width: 390,
        height: 844,
        id: 'cart-mobile',
        class: 'bg-white',
      }),
    ).toEqual({
      text: 'Added artboard cart-mobile "Cart, mobile", 390x844 at 1520,0.',
      isError: false,
      structured: { id: 'cart-mobile' },
    });
  });

  it('adds to the given page at the given position', async () => {
    await session.call('create_page', { file, name: 'Checkout', id: 'checkout' });
    await session.call('create_artboard', {
      file,
      page: 'checkout',
      name: 'Pay',
      width: 800,
      height: 600,
      x: 100,
      y: 200,
    });
    expect(await saved()).toMatchObject({
      pages: [
        { id: 'page-1' },
        {
          id: 'checkout',
          artboards: [
            { id: 'pay-1', name: 'Pay', x: 100, y: 200, width: 800, height: 600, children: [] },
          ],
        },
      ],
    });
  });

  it('rejects a size out of range without writing', async () => {
    expect(
      await session.call('create_artboard', { file, name: 'Huge', width: 20000, height: 900 }),
    ).toEqual({
      text: 'width must be a number from 1 to 10000, not 20000.',
      isError: true,
      structured: undefined,
    });
    await expect(readFile(file, 'utf8')).rejects.toThrow('ENOENT');
  });

  it('warns about an overlap it introduces', async () => {
    const result = await session.call('create_artboard', {
      file,
      name: 'Overlap',
      width: 100,
      height: 100,
      x: 10,
      y: 10,
    });
    expect(result.text).toBe(
      [
        `Created ${file} with page "page-1" and artboard "desktop".`,
        'Added artboard overlap-1 "Overlap", 100x100 at 10,10.',
        '',
        'New warnings:',
        '- warning artboard-overlap at pages[0].artboards[1]: Artboard "Overlap" overlaps "Desktop". Move it to a free spot, such as x: 1520, y: 10.',
      ].join('\n'),
    );
  });
});

describe('update_artboard', () => {
  it('changes only the given fields and clears the class with null', async () => {
    await writeFile(
      file,
      JSON.stringify({
        format: 'vision',
        version: 1,
        pages: [
          {
            id: 'p',
            name: 'P',
            artboards: [
              {
                id: 'a',
                name: 'A',
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                class: 'bg-white',
                children: [],
              },
            ],
          },
        ],
      }),
    );
    expect(
      await session.call('update_artboard', { file, id: 'a', name: 'B', width: 320, class: null }),
    ).toEqual({ text: 'Updated artboard a.', isError: false, structured: undefined });
    expect(await saved()).toMatchObject({
      pages: [
        { artboards: [{ id: 'a', name: 'B', x: 0, y: 0, width: 320, height: 10, children: [] }] },
      ],
    });
    expect(JSON.stringify(await saved())).not.toContain('bg-white');
  });

  it('rejects a node id', async () => {
    await session.call('write_html', { file, parent: 'desktop', html: '<p id="note">Hi</p>' });
    expect((await session.call('update_artboard', { file, id: 'note', width: 10 })).text).toBe(
      '"note" is a node, not an artboard. Pass an artboard id.',
    );
  });
});
