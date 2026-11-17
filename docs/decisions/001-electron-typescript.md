# 001. Build on Electron with one TypeScript codebase

- **Status**: accepted
- **Context**: Vision draws designs written as HTML-like nodes with CSS classes, and the most faithful renderer for that is a browser engine. The MCP server and the app both need the same parser and validator. A native core (Rust through a Node addon) would mean two languages, an ABI rebuild for every Electron upgrade, and a build step per platform, for work (parsing JSON) that isn't performance-bound.
- **Decision**: The app is Electron with React. The format, the MCP server and the app are TypeScript in one pnpm workspace, sharing `@vision/format`.
- **Consequences**:
  - One toolchain, one test runner and one set of types across the app and the server.
  - Chromium does layout, text, SVG and images, so screenshots taken by running the app match what people see.
  - The app download is large (~150 MB), which is acceptable for a desktop design tool.
