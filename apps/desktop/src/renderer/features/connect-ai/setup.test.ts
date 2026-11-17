import { describe, expect, it } from 'vitest';
import { claudeCodeSetup, codexSetup, jsonSetup, samplePrompt, shellQuote } from './setup';

const packaged = {
  command: '/Applications/Vision.app/Contents/MacOS/Vision',
  args: ['/Applications/Vision.app/Contents/Resources/mcp/vision-mcp.mjs'],
  env: { ELECTRON_RUN_AS_NODE: '1' },
};

const dev = { command: 'node', args: ["/Users/me/Jo's Code/vision-mcp.mjs"], env: {} };

describe('shellQuote', () => {
  it('leaves safe words alone and single-quotes everything else', () => {
    expect(shellQuote('/usr/bin/node')).toBe('/usr/bin/node');
    expect(shellQuote('/My Apps/Vision')).toBe("'/My Apps/Vision'");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});

describe('setup commands', () => {
  it('registers the packaged server with its environment', () => {
    expect(claudeCodeSetup(packaged)).toBe(
      'claude mcp add --scope user vision --env ELECTRON_RUN_AS_NODE=1 -- /Applications/Vision.app/Contents/MacOS/Vision /Applications/Vision.app/Contents/Resources/mcp/vision-mcp.mjs',
    );
    expect(codexSetup(packaged)).toBe(
      'codex mcp add vision --env ELECTRON_RUN_AS_NODE=1 -- /Applications/Vision.app/Contents/MacOS/Vision /Applications/Vision.app/Contents/Resources/mcp/vision-mcp.mjs',
    );
  });

  it('quotes paths with spaces and quotes', () => {
    expect(claudeCodeSetup(dev)).toBe(
      "claude mcp add --scope user vision -- node '/Users/me/Jo'\\''s Code/vision-mcp.mjs'",
    );
  });

  it('writes the JSON config used by Cursor and Claude Desktop', () => {
    expect(jsonSetup(packaged)).toBe(`{
  "mcpServers": {
    "vision": {
      "command": "/Applications/Vision.app/Contents/MacOS/Vision",
      "args": [
        "/Applications/Vision.app/Contents/Resources/mcp/vision-mcp.mjs"
      ],
      "env": {
        "ELECTRON_RUN_AS_NODE": "1"
      }
    }
  }
}`);
  });
});

describe('samplePrompt', () => {
  it('names the open file', () => {
    expect(samplePrompt('/Users/me/checkout.vis')).toBe(
      'Design a sign-up screen for a coffee subscription in /Users/me/checkout.vis. Call get_guide first.',
    );
  });
});
