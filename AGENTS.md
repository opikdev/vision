# Agent guide

Vision is an Electron app that draws `.vis` design files and redraws them on every save, plus `vision-mcp`, an MCP server that lets any AI create and edit those files.

## Commands

| Task                  | Command                                   |
| --------------------- | ----------------------------------------- |
| Install               | `pnpm install`                            |
| Run the app           | `pnpm dev`                                |
| Everything CI checks  | `pnpm check` (format, lint, types, tests) |
| End-to-end tests      | `pnpm test:e2e`                           |
| Build the MCP server  | `pnpm --filter @vision/mcp build`         |
| Package the macOS app | `pnpm package`                            |

## Map

- `packages/format`: the `.vis` format; read [docs/format.md](docs/format.md) first.
- `packages/mcp`: the `vision-mcp` server.
- `apps/desktop`: the Electron app; the UI rules are in [docs/ui.md](docs/ui.md).
- [docs/architecture.md](docs/architecture.md): how the pieces fit; [docs/decisions/](docs/decisions/): why.

## Conventions

- TypeScript strict everywhere. Validate data at every boundary (files, IPC, MCP input) with zod.
- No comments that restate code. Comment only a non-obvious why.
- Tests sit next to the code as `*.test.ts`; end-to-end specs live in `apps/desktop/e2e/`. Test behaviour, with literal expected values.
- Commits are one-line conventional commits (`feat(desktop): add zoom to fit`), no body, no trailers.
- Keep build output small: the disk is shared and nearly full. Don't add dependencies without a reason.
