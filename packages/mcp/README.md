# vision-mcp

The stdio MCP server that lets any AI create and edit `.vis` designs. Every tool takes `file`, the absolute path of a `.vis` file, so one registration serves every design. The tools are listed in [docs/format.md](../../docs/format.md#writing-designs-with-mcp).

## Build and run

```sh
pnpm --filter @vision/mcp build
node packages/mcp/dist/vision-mcp.mjs
```

The build is one self-contained file, `dist/vision-mcp.mjs`, with the format guide and Tailwind's stylesheets embedded. It runs anywhere with Node 24, without `node_modules`.

## Register it with an AI client

The packaged app ships this server; [Design with any AI](../../README.md#design-with-any-ai) has the commands for each client. To run your own build instead, use `node` as the command and `<repo>/packages/mcp/dist/vision-mcp.mjs` as the argument, with no `env`:

```sh
claude mcp add --scope user vision -- node <repo>/packages/mcp/dist/vision-mcp.mjs
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
