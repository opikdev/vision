import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { askSelection } from './ask-app';

let dir: string;
let path: string;
let server: Server | undefined;
let received: string[];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vision-ask-'));
  path = join(dir, 'activity.sock');
  received = [];
});

afterEach(async () => {
  const closing = server;
  server = undefined;
  if (closing !== undefined) await new Promise((resolve) => closing.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

function listen(answer: (request: { id: string; file: string }, socket: Socket) => void) {
  server = createServer((socket) => {
    socket.setEncoding('utf8');
    let buffer = '';
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const end = buffer.indexOf('\n');
      if (end < 0) return;
      const line = buffer.slice(0, end);
      received.push(line);
      answer(JSON.parse(line) as { id: string; file: string }, socket);
    });
  });
  return new Promise<void>((resolve) => server?.listen(path, resolve));
}

describe('askSelection', () => {
  it('returns the selection the app answers with', async () => {
    await listen(({ id }, socket) => {
      const selection = { pageId: 'checkout', nodeIds: ['cart-continue'] };
      socket.write(
        `${JSON.stringify({ v: 1, id: randomUUID(), response: { status: 'not-open' } })}\n`,
      );
      socket.write(`${JSON.stringify({ v: 1, id, response: { status: 'open', selection } })}\n`);
    });
    expect(await askSelection(path, '/Users/ada/shop.vis')).toEqual({
      status: 'open',
      selection: { pageId: 'checkout', nodeIds: ['cart-continue'] },
    });
    expect(JSON.parse(received[0] ?? '')).toMatchObject({
      v: 1,
      request: 'selection',
      file: '/Users/ada/shop.vis',
    });
  });

  it('says when the file is not open', async () => {
    await listen(({ id }, socket) => {
      socket.write(`${JSON.stringify({ v: 1, id, response: { status: 'not-open' } })}\n`);
    });
    expect(await askSelection(path, '/a.vis')).toEqual({ status: 'not-open' });
  });

  it('says when the app is not running', async () => {
    expect(await askSelection(path, '/a.vis')).toEqual({ status: 'not-running' });
  });

  it('gives up when the app does not answer in time or hangs up', async () => {
    await listen(() => undefined);
    const started = Date.now();
    expect(await askSelection(path, '/a.vis', { timeoutMs: 100 })).toEqual({
      status: 'no-answer',
    });
    expect(Date.now() - started).toBeLessThan(1000);

    const closing = server;
    await new Promise((resolve) => closing?.close(resolve));
    await listen((_request, socket) => {
      socket.end('not json\n');
    });
    expect(await askSelection(path, '/a.vis')).toEqual({ status: 'no-answer' });
  });
});
