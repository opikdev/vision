import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '../test-client';

const session = useSession();
let file: string;

beforeEach(() => {
  file = join(session.dir, 'shop.vis');
});

describe('write_html with icons', () => {
  it('draws <i data-icon> as a named svg node', async () => {
    const result = await session.call('write_html', {
      file,
      parent: 'desktop',
      html: '<button id="cart" class="flex gap-2"><i data-icon="shopping-cart-01" class="size-5 text-gray-500"></i>Cart</button>',
    });
    expect(result.text).toBe(
      [
        `Created ${file} with page "page-1" and artboard "desktop".`,
        'Added 1 node to desktop:',
        'frame cart class="flex gap-2"',
        '  svg icon-1 name="Shopping cart" class="size-5 text-gray-500" icon="shopping-cart-01"',
        '  text text-1 text="Cart"',
      ].join('\n'),
    );
  });

  it('rejects an unknown icon with suggestions and writes nothing', async () => {
    expect(
      await session.call('write_html', {
        file,
        parent: 'desktop',
        html: '<i data-icon="shoping-cart"></i>',
      }),
    ).toEqual({
      text: 'Unknown icon "shoping-cart". Did you mean "shopping-cart-01", "shopping-cart-02", "shopping-cart-add-01"? Call find_icons to search for more.',
      isError: true,
      structured: undefined,
    });
  });
});

describe('get_node with icons', () => {
  beforeEach(async () => {
    await session.call('write_html', {
      file,
      parent: 'desktop',
      html: '<div id="row"><i id="bell" data-icon="bell" class="size-5"></i><svg id="dot" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg></div>',
    });
  });

  it('summarises the markup of svgs inside the node', async () => {
    expect(JSON.parse((await session.call('get_node', { file, id: 'row' })).text)).toEqual({
      type: 'frame',
      id: 'row',
      children: [
        {
          type: 'svg',
          id: 'bell',
          name: 'Bell',
          class: 'size-5',
          svg: '[icon bell: 1168 characters of markup not shown]',
        },
        { type: 'svg', id: 'dot', svg: '[svg: 66 characters of markup not shown]' },
      ],
    });
  });

  it('shows the markup of an svg node asked for by its id', async () => {
    const node = JSON.parse((await session.call('get_node', { file, id: 'dot' })).text) as {
      svg: string;
    };
    expect(node.svg).toBe('<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"></circle></svg>');
  });
});

describe('find_icons', () => {
  it('lists matching names, best first', async () => {
    expect((await session.call('find_icons', { query: 'map pin', limit: 3 })).text).toBe(
      'map-pin\nmap-pin-x\nmap-pin-off',
    );
  });

  it('says when nothing matches', async () => {
    expect((await session.call('find_icons', { query: 'zzqx' })).text).toBe(
      'No icon matches "zzqx". Try one simpler word, such as "cart" or "user".',
    );
  });
});
