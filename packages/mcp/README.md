# vision-mcp

The stdio MCP server that lets any AI create and edit `.vis` designs. Every tool takes `file`, the absolute path of a `.vis` file, so one registration serves every design. The tools are listed in [docs/format.md](../../docs/format.md#writing-designs-with-mcp).

## Build and run

```sh
pnpm --filter @vision/mcp build
node packages/mcp/dist/vision-mcp.mjs
```

The build is one self-contained file, `dist/vision-mcp.mjs`, with the format guide and Tailwind's stylesheets embedded. It runs anywhere with Node 24, without `node_modules`.

## Register it with an AI client

Replace `<repo>` with the absolute path of this repository.

**Claude Code**

```sh
claude mcp add --scope user vision -- node <repo>/packages/mcp/dist/vision-mcp.mjs
```

**Codex CLI**, in `~/.codex/config.toml`:

```toml
[mcp_servers.vision]
command = "node"
args = ["<repo>/packages/mcp/dist/vision-mcp.mjs"]
```

**Cursor**, in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vision": {
      "command": "node",
      "args": ["<repo>/packages/mcp/dist/vision-mcp.mjs"],
      "env": {}
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
      "command": "node",
      "args": ["<repo>/packages/mcp/dist/vision-mcp.mjs"]
    }
  }
}
```

**Claude Desktop**, in `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vision": {
      "command": "node",
      "args": ["<repo>/packages/mcp/dist/vision-mcp.mjs"]
    }
  }
}
```

## Screenshots

`screenshot` runs the Vision app:

```sh
<app> [<entry>] --vision-screenshot <file.vis> --artboard <id> --out <file.png> [--scale 1|2]
```

The server looks for the app in this order:

| Source                     | Used when                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `VISION_APP`               | Set. Path of the executable; `VISION_APP_ENTRY`, if set, is passed as the first argument. |
| The server's own binary    | The server runs inside the packaged app (`ELECTRON_RUN_AS_NODE=1` under Electron).        |
| `/Applications/Vision.app` | On macOS, when it's installed.                                                            |

To use a development build, add `"env": { "VISION_APP": "<repo>/apps/desktop/node_modules/.bin/electron", "VISION_APP_ENTRY": "<repo>/apps/desktop" }` to the client's server config.
