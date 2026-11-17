import { writeFile } from 'node:fs/promises';
import { createServer as createSocketServer, type Server } from 'node:net';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityReporter } from '../activity/reporter';
import { createServer } from '../server';
import { useSession } from '../test-client';

const session = useSession();
let file: string;
let socket: string;
let app: Server | undefined;
let answer: Record<string, unknown>;
let received: Record<string, unknown>[];

const children = Array.from({ length: 22 }, (_, index) => ({
  type: 'text',
  id: `item-${index}`,
  text: `Item ${index}`,
}));

const design = {
  format: 'vision',
  version: 1,
  pages: [
    {
      id: 'checkout',
      name: 'Checkout',
      artboards: [
        {
          id: 'cart',
          name: 'Cart',
          x: 0,
          y: 0,
          width: 1440,
          height: 900,
          children: [
            {
              type: 'frame',
              id: 'cart-continue',
              class: 'flex h-12 items-center',
              children: [
                { type: 'text', id: 'span-26', text: 'Continue to payment' },
                { type: 'svg', id: 'svg-12', svg: '<svg viewBox="0 0 24 24"></svg>' },
              ],
            },
            { type: 'frame', id: 'list', name: 'Items', children },
          ],
        },
      ],
    },
  ],
};

beforeEach(async () => {
  file = join(session.dir, 'shop.vis');
  socket = join(session.dir, 'activity.sock');
  vi.stubEnv('VISION_ACTIVITY_SOCKET', socket);
  await writeFile(file, JSON.stringify(design));
  received = [];
  answer = { status: 'not-open' };
});

afterEach(async () => {
  vi.unstubAllEnvs();
  const closing = app;
  app = undefined;
  if (closing !== undefined) await new Promise((resolve) => closing.close(resolve));
});

function listen(): Promise<void> {
  app = createSocketServer((connection) => {
    let buffer = '';
    connection.setEncoding('utf8');
    connection.on('data', (chunk: string) => {
      buffer += chunk;
      for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
        const message = JSON.parse(buffer.slice(0, end)) as Record<string, unknown>;
        buffer = buffer.slice(end + 1);
        received.push(message);
        if (message.request === 'selection') {
          connection.write(`${JSON.stringify({ v: 1, id: message.id, response: answer })}\n`);
        }
      }
    });
  });
  return new Promise((resolve) => app?.listen(socket, resolve));
}

function selecting(...nodeIds: string[]) {
  answer = { status: 'open', selection: { pageId: 'checkout', nodeIds } };
}

describe('get_selection', () => {
  it('says what to do when Vision is not running', async () => {
    expect(await session.call('get_selection', { file })).toEqual({
      text: `Vision isn't running, so there's no selection to read. Open ${file} in Vision, select a layer, then ask again.`,
      isError: false,
      structured: undefined,
    });
  });

  it('says what to do when the file is not open or nothing is selected', async () => {
    await listen();
    expect((await session.call('get_selection', { file })).text).toBe(
      `${file} isn't open in Vision. Open it, select a layer, then ask again.`,
    );
    selecting();
    expect((await session.call('get_selection', { file })).text).toBe(
      `Nothing is selected in ${file}. Select a layer in Vision, then ask again.`,
    );
    expect(received.map((message) => message.file)).toEqual([file, file]);
  });

  it('describes the selected layer with its label, artboard and page', async () => {
    await listen();
    selecting('cart-continue');
    const result = await session.call('get_selection', { file });
    const [summary, , ...json] = result.text.split('\n');
    expect(summary).toBe(
      '1 layer selected in Vision on page "Checkout". Children are summarized; call get_tree or get_node with an id to see more.',
    );
    expect(JSON.parse(json.join('\n'))).toEqual({
      page: { id: 'checkout', name: 'Checkout' },
      selection: [
        {
          id: 'cart-continue',
          type: 'frame',
          label: 'Continue to payment',
          artboard: { id: 'cart', name: 'Cart' },
          node: {
            type: 'frame',
            id: 'cart-continue',
            class: 'flex h-12 items-center',
            childCount: 2,
            children: [
              { type: 'text', id: 'span-26', label: 'Continue to payment' },
              { type: 'svg', id: 'svg-12', label: 'Icon' },
            ],
          },
        },
      ],
    });
  });

  it('summarizes at most 20 children and describes selected artboards', async () => {
    await listen();
    selecting('list', 'cart');
    const result = await session.call('get_selection', { file });
    const { selection } = JSON.parse(result.text.split('\n').slice(2).join('\n')) as {
      selection: { id: string; type: string; name?: string; node: Record<string, unknown> }[];
    };
    const [list, cart] = selection;
    expect(list?.name).toBe('Items');
    expect(list?.node.childCount).toBe(22);
    expect((list?.node.children as unknown[]).length).toBe(20);
    expect(cart).toMatchObject({ id: 'cart', type: 'artboard', label: 'Cart', name: 'Cart' });
    expect(cart?.node).toEqual({
      id: 'cart',
      name: 'Cart',
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      childCount: 2,
      children: [
        { type: 'frame', id: 'cart-continue', label: 'Continue to payment' },
        { type: 'frame', id: 'list', label: 'Items' },
      ],
    });
  });

  it('says when the selected layer is no longer in the file', async () => {
    await listen();
    selecting('gone');
    expect((await session.call('get_selection', { file })).text).toBe(
      `The layer selected in Vision (gone) isn't in ${file} anymore. Select a layer in Vision, then ask again.`,
    );
  });

  it('shows the agent looking at the selected layer', async () => {
    await listen();
    selecting('cart-continue');
    const reporter = new ActivityReporter(socket);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createServer(reporter).connect(serverTransport);
    const client = new Client({ name: 'claude-code', version: '1.0.0' });
    await client.connect(clientTransport);

    await client.callTool({ name: 'get_selection', arguments: { file } });

    await vi.waitFor(() => {
      expect(received.filter((message) => 'activity' in message)).toMatchObject([
        {
          agent: 'Claude Code',
          file,
          activity: {
            kind: 'look',
            artboard: 'cart',
            node: 'cart-continue',
            summary: 'is looking at Continue to payment',
          },
        },
      ]);
    });
    await client.close();
    reporter.close();
  });
});
