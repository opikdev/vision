import { mkdtemp, rm } from 'node:fs/promises';
import { createServer as createSocketServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFakeVision } from '../fake-vision';
import { createServer } from '../server';
import { ActivityReporter } from './reporter';

let dir: string;
let path: string;
let app: Server | undefined;
let received: unknown[];
let connections: number;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vision-activity-'));
  path = join(dir, 'activity.sock');
  received = [];
  connections = 0;
});

afterEach(async () => {
  vi.unstubAllEnvs();
  const closing = app;
  app = undefined;
  if (closing !== undefined) await new Promise((resolve) => closing.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

function listen(): Promise<void> {
  app = createSocketServer((socket) => {
    connections++;
    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
        received.push(JSON.parse(buffer.slice(0, end)));
        buffer = buffer.slice(end + 1);
      }
    });
  });
  return new Promise((resolve) => app?.listen(path, resolve));
}

async function connect(reporter: ActivityReporter, name: string): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer(reporter).connect(serverTransport);
  const client = new Client({ name, version: '1.0.0' });
  await client.connect(clientTransport);
  return client;
}

function events() {
  return received.map((message) => {
    const { activity, agent, file } = message as Record<string, unknown>;
    return { agent, file, activity };
  });
}

describe('ActivityReporter', () => {
  it('reports what each tool does, named after the client', async () => {
    await listen();
    vi.stubEnv('VISION_APP', await writeFakeVision(dir));
    vi.stubEnv('FAKE_VISION_LOG', join(dir, 'log.json'));
    const reporter = new ActivityReporter(path);
    const client = await connect(reporter, 'claude-code');
    const file = join(dir, 'shop.vis');
    const call = async (name: string, args: Record<string, unknown>) => {
      const result = await client.callTool({ name, arguments: { file, ...args } });
      expect(result.isError, name).toBeFalsy();
    };

    await call('get_overview', {});
    await call('write_html', {
      parent: 'desktop',
      html: '<div id="card"><p id="title">Plan</p></div>',
    });
    await call('update_node', { id: 'title', text: 'Pro plan' });
    await call('delete', { id: 'title' });
    await call('set_tokens', { tokens: { color: { brand: '#1F3D2B' } } });
    await call('create_artboard', { id: 'mobile', name: 'Mobile', width: 390, height: 844 });
    await call('validate', {});
    await call('screenshot', { artboard: 'desktop' });
    await call('get_guide', {});
    await client.close();

    const agent = 'Claude Code';
    const expected = [
      { kind: 'look', summary: 'is reading the design' },
      {
        kind: 'edit',
        artboard: 'desktop',
        nodes: ['card', 'title'],
        summary: 'is adding 2 elements to Desktop',
      },
      {
        kind: 'edit',
        artboard: 'desktop',
        nodes: ['title'],
        summary: 'is editing 1 element in Desktop',
      },
      {
        kind: 'edit',
        artboard: 'desktop',
        nodes: ['card'],
        summary: 'is removing 1 element from Desktop',
      },
      { kind: 'edit', nodes: [], summary: 'is updating tokens' },
      { kind: 'edit', artboard: 'mobile', nodes: [], summary: 'is adding the artboard Mobile' },
      { kind: 'look', summary: 'is reading the design' },
      { kind: 'look', artboard: 'desktop', summary: 'is taking a screenshot of Desktop' },
    ];
    await vi.waitFor(() => {
      expect(events()).toEqual(expected.map((activity) => ({ agent, file, activity })));
    });
    expect(new Set(received.map((message) => (message as { session: string }).session))).toEqual(
      new Set([reporter.session]),
    );
    reporter.close();
  });

  it('names clients that declare themselves on each request', async () => {
    await listen();
    const reporter = new ActivityReporter(path);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    serveStdio(() => createServer(reporter), { transport: serverTransport });
    const client = new Client(
      { name: 'codex-mcp-client', version: '1.0.0' },
      { versionNegotiation: { mode: { pin: '2026-07-28' } } },
    );
    await client.connect(clientTransport);
    await client.callTool({ name: 'get_overview', arguments: { file: join(dir, 'shop.vis') } });
    await vi.waitFor(() => {
      expect(events()).toEqual([
        {
          agent: 'Codex',
          file: join(dir, 'shop.vis'),
          activity: { kind: 'look', summary: 'is reading the design' },
        },
      ]);
    });
    await client.close();
    reporter.close();
  });

  it('keeps tools working when the app is not running', async () => {
    const reporter = new ActivityReporter(join(dir, 'missing', 'activity.sock'));
    const client = await connect(reporter, 'claude-code');
    const result = await client.callTool({
      name: 'write_html',
      arguments: { file: join(dir, 'shop.vis'), parent: 'desktop', html: '<p>Hi</p>' },
    });
    expect(result.isError).toBeFalsy();
    await client.close();
    reporter.close();
  });

  it('retries a failed connection only after the retry delay', async () => {
    let now = 0;
    const reporter = new ActivityReporter(path, { retryMs: 3000, now: () => now });
    const event = (summary: string) => ({
      agent: 'Codex',
      file: '/a.vis',
      activity: { kind: 'look' as const, summary },
    });

    reporter.report(event('first'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    await listen();
    now = 2999;
    reporter.report(event('too soon'));
    now = 3000;
    reporter.report(event('retried'));

    await vi.waitFor(() => {
      expect(events()).toEqual([event('retried')]);
    });
    expect(connections).toBe(1);
    reporter.close();
  });

  it('says it is done with every file it reported on when it closes', async () => {
    await listen();
    const reporter = new ActivityReporter(path);
    const look = { kind: 'look' as const, summary: 'is reading the design' };
    reporter.report({ agent: 'Cursor', file: '/a.vis', activity: look });
    reporter.report({ agent: 'Cursor', file: '/b.vis', activity: look });
    reporter.close();

    await vi.waitFor(() => {
      expect(events()).toEqual([
        { agent: 'Cursor', file: '/a.vis', activity: look },
        { agent: 'Cursor', file: '/b.vis', activity: look },
        { agent: 'Cursor', file: '/a.vis', activity: { kind: 'done' } },
        { agent: 'Cursor', file: '/b.vis', activity: { kind: 'done' } },
      ]);
    });
  });
});
