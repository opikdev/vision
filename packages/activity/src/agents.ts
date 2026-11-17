export interface ClientInfo {
  name?: string | undefined;
  title?: string | undefined;
}

const knownClients = new Map([
  ['claude-code', 'Claude Code'],
  ['claude-ai', 'Claude'],
  ['codex-mcp-client', 'Codex'],
  ['cursor-vscode', 'Cursor'],
  ['Visual Studio Code', 'VS Code'],
]);

const maxNameLength = 64;

export function agentName(client: ClientInfo | undefined): string {
  const name = client?.name?.trim() ?? '';
  const title = client?.title?.trim() ?? '';
  const shown = knownClients.get(name) ?? (title || name);
  return shown === '' ? 'An agent' : shown.slice(0, maxNameLength);
}
