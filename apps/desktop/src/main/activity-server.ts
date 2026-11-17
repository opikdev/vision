import {
  encodeLine,
  maxLineBytes,
  parseActivity,
  parseSelectionRequest,
  type ActivityMessage,
  type Selection,
  type SelectionRequest,
  type SelectionResponse,
} from '@vision/activity';
import { chmod, mkdir, realpath, unlink } from 'node:fs/promises';
import { createConnection, createServer, type Server, type Socket } from 'node:net';
import { dirname } from 'node:path';
import { isMissingFileError } from '@vision/format/node';

export type ActivityDelivery = (message: ActivityMessage, file: string) => void;
export type SelectionLookup = (file: string) => Selection | undefined;

const maxCachedPaths = 256;

export class ActivityServer {
  readonly #server: Server;
  readonly #deliver: ActivityDelivery;
  readonly #lookUp: SelectionLookup;
  readonly #sockets = new Set<Socket>();
  readonly #realpaths = new Map<string, string>();
  #queue = Promise.resolve();

  static async start(
    path: string,
    deliver: ActivityDelivery,
    lookUp: SelectionLookup,
  ): Promise<ActivityServer | undefined> {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    if (await answers(path)) return undefined;
    await removeStale(path);
    const activity = new ActivityServer(deliver, lookUp);
    await new Promise<void>((resolve, reject) => {
      activity.#server.once('error', reject);
      activity.#server.listen(path, () => {
        activity.#server.off('error', reject);
        resolve();
      });
    });
    await chmod(path, 0o600);
    return activity;
  }

  private constructor(deliver: ActivityDelivery, lookUp: SelectionLookup) {
    this.#deliver = deliver;
    this.#lookUp = lookUp;
    this.#server = createServer((socket) => {
      this.#accept(socket);
    });
    this.#server.on('error', (error) => {
      console.error('The agent activity socket failed:', error);
    });
  }

  async close(): Promise<void> {
    const closed = new Promise<void>((resolve) =>
      this.#server.close(() => {
        resolve();
      }),
    );
    for (const socket of this.#sockets) socket.destroy();
    await closed;
    await this.#queue;
  }

  #accept(socket: Socket): void {
    this.#sockets.add(socket);
    const open = new Map<string, ActivityMessage>();
    let buffer = '';
    let skipping = false;
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        if (!skipping && Buffer.byteLength(line) <= maxLineBytes) this.#receive(line, open, socket);
        skipping = false;
      }
      if (Buffer.byteLength(buffer) > maxLineBytes) {
        buffer = '';
        skipping = true;
      }
    });
    socket.on('error', (error) => {
      console.warn('An agent activity connection failed:', error.message);
    });
    socket.on('close', () => {
      this.#sockets.delete(socket);
      for (const message of open.values()) {
        this.#enqueue({ ...message, at: Date.now(), activity: { kind: 'done' } });
      }
    });
  }

  #receive(line: string, open: Map<string, ActivityMessage>, socket: Socket): void {
    const request = parseSelectionRequest(line);
    if (request !== undefined) {
      this.#answer(request, socket);
      return;
    }
    const message = parseActivity(line);
    if (message === undefined) return;
    const key = `${message.session}\u0000${message.file}`;
    if (message.activity.kind === 'done') open.delete(key);
    else open.set(key, message);
    this.#enqueue(message);
  }

  #enqueue(message: ActivityMessage): void {
    this.#queue = this.#queue
      .then(async () => {
        const file = await this.#realpath(message.file);
        if (file !== undefined) this.#deliver(message, file);
      })
      .catch((error: unknown) => {
        console.error(`Routing agent activity for ${message.file} failed:`, error);
      });
  }

  #answer(request: SelectionRequest, socket: Socket): void {
    this.#queue = this.#queue
      .then(async () => {
        // A path that can't be resolved can't be the file a window shows.
        const file = await this.#realpath(request.file).catch(() => undefined);
        const selection = file === undefined ? undefined : this.#lookUp(file);
        const response: SelectionResponse['response'] =
          selection === undefined ? { status: 'not-open' } : { status: 'open', selection };
        const line = encodeLine({ v: 1, id: request.id, response });
        if (line !== undefined && !socket.destroyed) socket.write(line);
      })
      .catch((error: unknown) => {
        console.error(`Answering a selection request for ${request.file} failed:`, error);
      });
  }

  async #realpath(path: string): Promise<string | undefined> {
    const cached = this.#realpaths.get(path);
    if (cached !== undefined) return cached;
    let real: string;
    try {
      real = await realpath(path);
    } catch (error) {
      if (isMissingFileError(error)) return undefined;
      throw error;
    }
    if (this.#realpaths.size >= maxCachedPaths) this.#realpaths.clear();
    this.#realpaths.set(path, real);
    return real;
  }
}

function answers(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createConnection(path);
    probe.once('connect', () => {
      probe.destroy();
      resolve(true);
    });
    probe.once('error', () => {
      resolve(false);
    });
  });
}

async function removeStale(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
}
