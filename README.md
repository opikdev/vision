# Vision

Watch a UI design take shape while an AI builds it. Vision is a macOS app that draws `.vis` design files and redraws them on every save, and it ships `vision-mcp`, an MCP server that lets any AI create and edit those files.

## Install

Requires macOS, Node 24 and pnpm.

```sh
git clone <repo-url> vision && cd vision
pnpm install
pnpm package
cp -R apps/desktop/release/mac*/Vision.app /Applications/
```

The app is ad-hoc signed, not notarized. A copy you built yourself opens normally; if you move it to another Mac, macOS blocks the first launch. Allow it in **System Settings → Privacy & Security → Open Anyway**.

## Design with any AI

1. Open Vision and choose **New design** to create a `.vis` file.
2. Open the app menu (the icon at the top left) and choose **Connect an AI…**. It shows the exact command for your install; copy it once and every design works.
3. Ask your AI to design in that file, and watch Vision redraw on every save.

For Vision in `/Applications`, the commands are:

**Claude Code**

```sh
claude mcp add --scope user vision --env ELECTRON_RUN_AS_NODE=1 -- /Applications/Vision.app/Contents/MacOS/Vision /Applications/Vision.app/Contents/Resources/mcp/vision-mcp.mjs
```

**Codex CLI**

```sh
codex mcp add vision --env ELECTRON_RUN_AS_NODE=1 -- /Applications/Vision.app/Contents/MacOS/Vision /Applications/Vision.app/Contents/Resources/mcp/vision-mcp.mjs
```

**Cursor, Claude Desktop and other tools**, in `~/.cursor/mcp.json`, `~/Library/Application Support/Claude/claude_desktop_config.json` or your tool's MCP config:

```json
{
  "mcpServers": {
    "vision": {
      "command": "/Applications/Vision.app/Contents/MacOS/Vision",
      "args": ["/Applications/Vision.app/Contents/Resources/mcp/vision-mcp.mjs"],
      "env": {
        "ELECTRON_RUN_AS_NODE": "1"
      }
    }
  }
}
```

**VS Code**, in `.vscode/mcp.json`:

```json
{
  "servers": {
    "vision": {
      "type": "stdio",
      "command": "/Applications/Vision.app/Contents/MacOS/Vision",
      "args": ["/Applications/Vision.app/Contents/Resources/mcp/vision-mcp.mjs"],
      "env": {
        "ELECTRON_RUN_AS_NODE": "1"
      }
    }
  }
}
```

`ELECTRON_RUN_AS_NODE=1` makes the app's own binary run the server as plain Node, so you need no separate Node install. Then try a prompt like:

> Design a sign-up screen for a coffee subscription in /Users/you/Documents/Untitled.vis. Call get_guide first.

## Develop

| Task                       | Command                           |
| -------------------------- | --------------------------------- |
| Install dependencies       | `pnpm install`                    |
| Run the app                | `pnpm dev`                        |
| Format, lint, types, tests | `pnpm check`                      |
| End-to-end tests           | `pnpm test:e2e`                   |
| Build the MCP server       | `pnpm --filter @vision/mcp build` |
| Package the macOS app      | `pnpm package`                    |

## Docs

- [The `.vis` format](docs/format.md) and the [MCP server](packages/mcp/README.md)
- [Architecture](docs/architecture.md) and [decisions](docs/decisions/)
- [App UI rules](docs/ui.md)
- [Design review](docs/review.md) and [measuring design quality](docs/design-evals.md)
- [Releasing](docs/releasing.md)
- [Measuring performance](docs/performance.md)
