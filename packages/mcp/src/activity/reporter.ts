import { encodeActivity, type Activity, type ActivityMessage } from '@vision/activity';
import { randomUUID } from 'node:crypto';
import { createConnection, type Socket } from 'node:net';

export interface ActivityEvent {
  agent: string;
  file: string;
  activity: Activity;
}

export interface ReporterOptions {
  retryMs?: number;
  now?: () => number;
}

const maxBufferedBytes = 1024 * 1024;

export class ActivityReporter {
  readonly session = randomUUID();
  readonly #path: string;
  readonly #retryMs: number;
  readonly #now: () => number;
  readonly #agents = new Map<string, string>();
  #socket: Socket | undefined;
  #retryAt = 0;

  constructor(path: string, { retryMs = 3000, now = Date.now }: ReporterOptions = {}) {
    this.#path = path;
    this.#retryMs = retryMs;
    this.#now = now;
  }

  report(event: ActivityEvent): void {
    this.#agents.set(event.file, event.agent);
    this.#write({ v: 1, session: this.session, at: this.#now(), ...event });
  }

  close(): void {
    for (const [file, agent] of this.#agents)
      this.report({ agent, file, activity: { kind: 'done' } });
    this.#agents.clear();
    this.#socket?.end();
    this.#socket = undefined;
  }

  #write(message: ActivityMessage): void {
    const line = encodeActivity(message);
    const socket = this.#connect();
    if (line === undefined || socket === undefined) return;
    if (socket.writableLength + line.length > maxBufferedBytes) return;
    socket.write(line);
  }

  #connect(): Socket | undefined {
    if (this.#socket !== undefined) return this.#socket;
    if (this.#now() < this.#retryAt) return undefined;
    const socket = createConnection(this.#path);
    socket.unref();
    // The Vision app may not be running; activity is display-only, so it's dropped until it is.
    socket.on('error', () => {
      this.#drop(socket);
    });
    socket.on('close', () => {
      this.#drop(socket);
    });
    this.#socket = socket;
    return socket;
  }

  #drop(socket: Socket): void {
    socket.destroy();
    if (this.#socket !== socket) return;
    this.#socket = undefined;
    this.#retryAt = this.#now() + this.#retryMs;
  }
}
