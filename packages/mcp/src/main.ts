#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server';

const handle = serveStdio(createServer, {
  onerror: (error) => {
    console.error(`vision-mcp: ${error.message}`);
  },
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    handle.close().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error('vision-mcp: failed to close', error);
        process.exit(1);
      },
    );
  });
}
