import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { afterEach, beforeEach } from 'vitest';
import { createServer } from './server';

export interface ToolCall {
  text: string;
  isError: boolean;
  structured: unknown;
}

export interface Session {
  dir: string;
  client: Client;
  call(name: string, args: Record<string, unknown>): Promise<ToolCall>;
}

export function useSession(): Session {
  const session = {} as Session;
  beforeEach(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createServer().connect(serverTransport);
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(clientTransport);
    session.dir = await mkdtemp(join(tmpdir(), 'vision-mcp-'));
    session.client = client;
    session.call = async (name, args) => {
      const result = await client.callTool({ name, arguments: args });
      const text = result.content
        .map((block) => (block.type === 'text' ? block.text : `[${block.type}]`))
        .join('\n');
      return { text, isError: result.isError === true, structured: result.structuredContent };
    };
  });
  afterEach(async () => {
    await session.client.close();
    await rm(session.dir, { recursive: true, force: true });
  });
  return session;
}
