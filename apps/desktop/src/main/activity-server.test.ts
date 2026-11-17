import type { ActivityMessage, Selection } from '@vision/activity';
import { mkdir, mkdtemp, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { createConnection, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityServer } from './activity-server';

let dir: string;
let path: string;
let design: string;
let server: ActivityServer | undefined;
let delivered: { file: string; session: string; activity: ActivityMessage['activity'] }[];
let selections: Map<string, Selection>;
const clients: Socket[] = [];

const session = '0b6e1c2a-4f7d-4c51-9d0e-3a8b2f6c1d90';

function message(file: string, activity: ActivityMessage['activity']): string {
  return `${JSON.stringify({ v: 1, session, agent: 'Claude Code', file, at: 1, activity })}\n`;
}

const look = { kind: 'look', summary: 'is reading the design' } as const;

beforeEach(async () => {
  dir = await realpath(await mkdtemp(join(tmpdir(), 'vision-activity-')));
  path = join(dir, 'app', 'activity.sock');
  design = join(dir, 'shop.vis');
  await writeFile(design, '{}');
  delivered = [];
  selections = new Map();
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.destroy();
  await server?.close();
  server = undefined;
  await rm(dir, { recursive: true, force: true });
});

async function start(): Promise<ActivityServer | undefined> {
  server = await ActivityServer.start(
    path,
    (received, file) => {
      delivered.push({ file, session: received.session, activity: received.activity });
    },
    (file) => selections.get(file),
  );
  return server;
}

async function connect(): Promise<Socket> {
  const client = createConnection(path);
  clients.push(client);
  await new Promise((resolve) => client.once('connect', resolve));
  return client;
}

describe('ActivityServer', () => {
  it('delivers valid messages with the real path of the design', async () => {
    await start();
    const link = join(dir, 'link.vis');
    await symlink(design, link);
    const client = await connect();

    client.write(message(link, look).slice(0, 20));
    client.write(message(link, look).slice(20));
    client.write(
      message(design, { kind: 'edit', nodes: ['a'], summary: 'is adding 1 element to Cart' }),
    );

    await vi.waitFor(() => {
      expect(delivered).toEqual([
        { file: design, session, activity: look },
        {
          file: design,
          session,
          activity: { kind: 'edit', nodes: ['a'], summary: 'is adding 1 element to Cart' },
        },
      ]);
    });
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  it('skips invalid lines, lines over 64 KB and files that do not exist', async () => {
    await start();
    const client = await connect();

    client.write('not json\n');
    const nodes = Array.from({ length: 500 }, (_, index) => `${index}`.padStart(200, 'n'));
    client.write(message(design, { kind: 'edit', nodes, summary: 'is adding 500 elements' }));
    client.write(message(join(dir, 'missing.vis'), look));
    client.write(message(design, look));

    await vi.waitFor(() => {
      expect(delivered).toEqual([{ file: design, session, activity: look }]);
    });
  });

  it('ends the sessions of a client that disconnects', async () => {
    await start();
    const client = await connect();
    client.write(message(design, look));
    await vi.waitFor(() => {
      expect(delivered).toHaveLength(1);
    });

    client.end();

    await vi.waitFor(() => {
      expect(delivered).toEqual([
        { file: design, session, activity: look },
        { file: design, session, activity: { kind: 'done' } },
      ]);
    });
  });

  it('leaves the socket to another Vision that already answers on it', async () => {
    const first = await start();
    expect(first).toBeInstanceOf(ActivityServer);
    expect(
      await ActivityServer.start(
        path,
        () => undefined,
        () => undefined,
      ),
    ).toBeUndefined();
  });

  it('replaces a stale socket file', async () => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, '');

    expect(await start()).toBeInstanceOf(ActivityServer);
    const client = await connect();
    client.write(message(design, look));
    await vi.waitFor(() => {
      expect(delivered).toHaveLength(1);
    });
  });

  it('answers selection requests for the files its windows show, by real path', async () => {
    await start();
    selections.set(design, { pageId: 'checkout', nodeIds: ['cart-continue'] });
    const link = join(dir, 'link.vis');
    await symlink(design, link);
    const client = await connect();
    const lines: unknown[] = [];
    client.setEncoding('utf8');
    client.on('data', (chunk: string) => {
      for (const line of chunk.split('\n'))
        if (line !== '') lines.push(JSON.parse(line) as unknown);
    });
    const ask = (id: string, file: string) => {
      client.write(`${JSON.stringify({ v: 1, id, request: 'selection', file })}\n`);
    };

    ask(requests[0], link);
    ask(requests[1], join(dir, 'missing.vis'));
    ask(requests[2], join(dir, 'missing', 'dir', 'x.vis'));
    await writeFile(join(dir, 'closed.vis'), '{}');
    ask(requests[3], join(dir, 'closed.vis'));

    await vi.waitFor(() => {
      expect(lines).toEqual([
        {
          v: 1,
          id: requests[0],
          response: {
            status: 'open',
            selection: { pageId: 'checkout', nodeIds: ['cart-continue'] },
          },
        },
        { v: 1, id: requests[1], response: { status: 'not-open' } },
        { v: 1, id: requests[2], response: { status: 'not-open' } },
        { v: 1, id: requests[3], response: { status: 'not-open' } },
      ]);
    });
    expect(delivered).toEqual([]);
  });
});

const requests = [
  '6f1c1b4e-0c4a-4b8e-9f43-2b1f1d1f0a01',
  '6f1c1b4e-0c4a-4b8e-9f43-2b1f1d1f0a02',
  '6f1c1b4e-0c4a-4b8e-9f43-2b1f1d1f0a03',
  '6f1c1b4e-0c4a-4b8e-9f43-2b1f1d1f0a04',
] as const;
