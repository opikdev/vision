#!/usr/bin/env node
import { socketPath } from '@vision/activity/node';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { ActivityReporter } from './activity/reporter';
import { createServer } from './server';

const activity = new ActivityReporter(socketPath());
const handle = serveStdio(() => createServer(activity), {
  onerror: (error) => {
    console.error(`vision-mcp: ${error.message}`);
  },
});

process.stdin.once('end', () => {
  activity.close();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    activity.close();
    handle.close().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error('vision-mcp: failed to close', error);
        process.exit(1);
      },
    );
  });
}
