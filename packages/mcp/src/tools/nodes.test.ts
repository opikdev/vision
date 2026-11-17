import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '../test-client';

const session = useSession();
let file: string;

const card =
  '<div id="card" class="flex flex-col gap-2 rounded-xl p-6"><h2 class="text-lg font-semibold">Plan</h2><p id="price">$12</p></div>';

beforeEach(() => {
  file = join(session.dir, 'app.vis');
});

async function tree(): Promise<string> {
  return (await session.call('get_tree', { file })).text;
}

describe('write_html', () => {
  it('adds nodes and returns their outline and ids', async () => {
    expect(await session.call('write_html', { file, parent: 'desktop', html: card })).toEqual({
      text: [
        `Created ${file} with page "page-1" and artboard "desktop".`,
        'Added 1 node to desktop:',
        'frame card class="flex flex-col gap-2 rounded-xl p-6"',
        '  text h2-1 class="text-lg font-semibold" text="Plan"',
        '  text price text="$12"',
      ].join('\n'),
      isError: false,
      structured: { ids: ['card'] },
    });
  });

  it('reports unknown classes it introduces, with a suggestion', async () => {
    await session.call('write_html', {
      file,
      parent: 'desktop',
      html: '<p class="font-bld">A</p>',
    });
    const result = await session.call('write_html', {
      file,
      parent: 'desktop',
      html: '<p class="text-grey-500">B</p>',
    });
    expect(result.text).toBe(
      [
        'Added 1 node to desktop:',
        'text p-2 class="text-grey-500" text="B"',
        '',
        'New warnings:',
        '- warning unknown-class at pages[0].artboards[0].children[1].class: Unknown class "text-grey-500". Did you mean `text-gray-500`?',
      ].join('\n'),
    );
  });

  it('inserts at an index and replaces children', async () => {
    await session.call('write_html', {
      file,
      parent: 'desktop',
      html: '<p id="a">A</p><p id="c">C</p>',
    });
    await session.call('write_html', {
      file,
      parent: 'desktop',
      html: '<p id="b">B</p>',
      index: 1,
    });
    expect(await tree()).toBe(
      [
        'page page-1 name="Page 1"',
        '  artboard desktop name="Desktop" 1440x900 at 0,0 class="bg-white"',
        '    text a text="A"',
        '    text b text="B"',
        '    text c text="C"',
      ].join('\n'),
    );
    await session.call('write_html', {
      file,
      parent: 'desktop',
      html: '<p id="d">D</p>',
      replace: true,
    });
    expect(await tree()).toBe(
      [
        'page page-1 name="Page 1"',
        '  artboard desktop name="Desktop" 1440x900 at 0,0 class="bg-white"',
        '    text d text="D"',
      ].join('\n'),
    );
  });

  it('rejects HTML the format does not allow', async () => {
    expect(
      await session.call('write_html', {
        file,
        parent: 'desktop',
        html: '<div style="color: red">x</div>',
      }),
    ).toMatchObject({ isError: true });
  });

  it('suggests the closest id for an unknown parent', async () => {
    expect(await session.call('write_html', { file, parent: 'dekstop', html: '<p>x</p>' })).toEqual(
      {
        text: 'No page, artboard or node has id "dekstop". Did you mean "desktop"?',
        isError: true,
        structured: undefined,
      },
    );
  });
});

describe('update_node', () => {
  it('changes and clears fields', async () => {
    await session.call('write_html', { file, parent: 'desktop', html: card });
    expect(
      await session.call('update_node', {
        file,
        id: 'price',
        text: '$15',
        class: 'text-xl',
        name: 'Price',
      }),
    ).toEqual({ text: 'Updated node price.', isError: false, structured: undefined });
    await session.call('update_node', { file, id: 'card', class: null });
    expect(await tree()).toBe(
      [
        'page page-1 name="Page 1"',
        '  artboard desktop name="Desktop" 1440x900 at 0,0 class="bg-white"',
        '    frame card',
        '      text h2-1 class="text-lg font-semibold" text="Plan"',
        '      text price name="Price" class="text-xl" text="$15"',
      ].join('\n'),
    );
  });

  it('rejects a field the node type lacks', async () => {
    await session.call('write_html', { file, parent: 'desktop', html: card });
    expect((await session.call('update_node', { file, id: 'card', text: 'x' })).text).toBe(
      'A frame node has no "text". Fields you can set on a frame node: name, class.',
    );
  });
});

describe('move_node', () => {
  it('moves a node into another frame', async () => {
    await session.call('write_html', {
      file,
      parent: 'desktop',
      html: `${card}<p id="note">Note</p>`,
    });
    expect(await session.call('move_node', { file, id: 'note', parent: 'card', index: 0 })).toEqual(
      {
        text: 'Moved node note into card.',
        isError: false,
        structured: undefined,
      },
    );
    expect(await tree()).toBe(
      [
        'page page-1 name="Page 1"',
        '  artboard desktop name="Desktop" 1440x900 at 0,0 class="bg-white"',
        '    frame card class="flex flex-col gap-2 rounded-xl p-6"',
        '      text note text="Note"',
        '      text h2-1 class="text-lg font-semibold" text="Plan"',
        '      text price text="$12"',
      ].join('\n'),
    );
  });

  it('refuses to move a node into itself', async () => {
    await session.call('write_html', { file, parent: 'desktop', html: card });
    expect((await session.call('move_node', { file, id: 'card', parent: 'card' })).text).toBe(
      `Can't move "card" into itself or one of its descendants. Choose a parent outside it.`,
    );
  });
});

describe('delete', () => {
  it('deletes a node with its children', async () => {
    await session.call('write_html', { file, parent: 'desktop', html: card });
    expect(await session.call('delete', { file, id: 'card' })).toEqual({
      text: 'Deleted card and everything inside it.',
      isError: false,
      structured: undefined,
    });
    expect(await tree()).toBe(
      'page page-1 name="Page 1"\n  artboard desktop name="Desktop" 1440x900 at 0,0 class="bg-white"',
    );
  });

  it('refuses to delete the only page', async () => {
    expect((await session.call('delete', { file, id: 'page-1' })).text).toBe(
      `Can't delete "page-1", the only page. A design needs at least one page; add another page first.`,
    );
  });
});
