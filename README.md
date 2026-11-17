# Vision

Watch a UI design take shape while an AI builds it. Vision is a desktop app that draws `.vis` design files and redraws them on every save, and `vision-mcp` is an MCP server that lets any AI create and edit those files.

## Develop

Requires Node 24 and pnpm.

```sh
pnpm install
pnpm dev      # run the app
pnpm check    # format, lint, types, tests
```

## Docs

- [The `.vis` format](docs/format.md)
- [Architecture](docs/architecture.md) and [decisions](docs/decisions/)
- [App UI rules](docs/ui.md)
