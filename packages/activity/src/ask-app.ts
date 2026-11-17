import { randomUUID } from 'node:crypto';
import { createConnection } from 'node:net';
import { encodeLine, parseSelectionResponse, type Selection } from './selection';

export type SelectionAnswer =
  | { status: 'not-running' }
  | { status: 'no-answer' }
  | { status: 'not-open' }
  | { status: 'open'; selection: Selection };

export function askSelection(
  socket: string,
  file: string,
  { timeoutMs = 1000 }: { timeoutMs?: number } = {},
): Promise<SelectionAnswer> {
  const id = randomUUID();
  const line = encodeLine({ v: 1, id, request: 'selection', file });
  if (line === undefined) return Promise.resolve({ status: 'no-answer' });
  return new Promise((resolve) => {
    const connection = createConnection(socket);
    let connected = false;
    let buffer = '';
    const finish = (answer: SelectionAnswer) => {
      clearTimeout(timer);
      connection.destroy();
      resolve(answer);
    };
    const timer = setTimeout(() => {
      finish({ status: connected ? 'no-answer' : 'not-running' });
    }, timeoutMs);
    connection.setEncoding('utf8');
    connection.once('connect', () => {
      connected = true;
      connection.write(line);
    });
    // A missing or refused socket means the Vision app isn't running.
    connection.once('error', () => {
      finish({ status: connected ? 'no-answer' : 'not-running' });
    });
    connection.once('close', () => {
      finish({ status: connected ? 'no-answer' : 'not-running' });
    });
    connection.on('data', (chunk: string) => {
      buffer += chunk;
      for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
        const response = parseSelectionResponse(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
        if (response?.id === id) finish(response.response);
      }
      if (buffer.length > 64 * 1024) finish({ status: 'no-answer' });
    });
  });
}
