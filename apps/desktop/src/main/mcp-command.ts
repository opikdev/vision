import { join, resolve } from 'node:path';
import type { McpServer } from '../shared/contract';

export interface McpCommandContext {
  isPackaged: boolean;
  execPath: string;
  resourcesPath: string;
  appPath: string;
}

export function resolveMcpServer(context: McpCommandContext): McpServer {
  if (context.isPackaged) {
    return {
      command: context.execPath,
      args: [join(context.resourcesPath, 'mcp', 'vision-mcp.mjs')],
      env: { ELECTRON_RUN_AS_NODE: '1' },
    };
  }
  const repoRoot = resolve(context.appPath, '..', '..');
  return {
    command: 'node',
    args: [join(repoRoot, 'packages', 'mcp', 'dist', 'vision-mcp.mjs')],
    env: {},
  };
}
