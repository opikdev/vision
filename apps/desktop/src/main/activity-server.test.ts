import type { ActivityMessage } from '@vision/activity';
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
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.destroy();
  await server?.close();
  server = undefined;
  await rm(dir, { recursive: true, force: true });
});

async function start(): Promise<ActivityServer | undefined> {
  server = await ActivityServer.start(path, (received, file) => {
    delivered.push({ file, session: received.session, activity: received.activity });
  });
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
    expect(await ActivityServer.start(path, () => undefined)).toBeUndefined();
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
});
