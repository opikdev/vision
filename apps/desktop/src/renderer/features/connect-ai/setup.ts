import type { McpServer } from '../../../shared/contract';

export function shellQuote(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", `'\\''`)}'`;
}

function envFlags(server: McpServer): string[] {
  return Object.entries(server.env).map(([key, value]) => `--env ${shellQuote(`${key}=${value}`)}`);
}

function commandLine(server: McpServer): string {
  return [server.command, ...server.args].map(shellQuote).join(' ');
}

export function claudeCodeSetup(server: McpServer): string {
  return [
    'claude mcp add --scope user vision',
    ...envFlags(server),
    '--',
    commandLine(server),
  ].join(' ');
}

export function codexSetup(server: McpServer): string {
  return ['codex mcp add vision', ...envFlags(server), '--', commandLine(server)].join(' ');
}

export function jsonSetup(server: McpServer): string {
  return JSON.stringify(
    { mcpServers: { vision: { command: server.command, args: server.args, env: server.env } } },
    null,
    2,
  );
}

export function samplePrompt(path: string | null): string {
  return `Design a sign-up screen for a coffee subscription in ${path ?? '/path/to/design.vis'}. Call get_guide first.`;
}
