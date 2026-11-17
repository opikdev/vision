import { describe, expect, it } from 'vitest';
import { agentName } from './agents';

describe('agentName', () => {
  it.each([
    [{ name: 'claude-code', title: 'Claude Code CLI' }, 'Claude Code'],
    [{ name: 'codex-mcp-client', title: 'Codex' }, 'Codex'],
    [{ name: 'cursor-vscode' }, 'Cursor'],
    [{ name: 'claude-ai' }, 'Claude'],
    [{ name: 'Visual Studio Code' }, 'VS Code'],
    [{ name: 'zed', title: 'Zed' }, 'Zed'],
    [{ name: ' my-agent ' }, 'my-agent'],
    [{ name: 'constructor' }, 'constructor'],
    [{ name: '', title: '  ' }, 'An agent'],
    [undefined, 'An agent'],
  ])('names %j %j', (client, expected) => {
    expect(agentName(client)).toBe(expected);
  });

  it('shortens long names to 64 characters', () => {
    expect(agentName({ name: 'x'.repeat(100) })).toBe('x'.repeat(64));
  });
});
