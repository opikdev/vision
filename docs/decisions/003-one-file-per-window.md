# 003. Open one `.vis` file per window

- **Status**: accepted
- **Context**: A `.vis` file already holds pages and artboards, and the unit people share, version and hand to an AI is one file.
- **Decision**: Each window shows one file. Opening a file that's already open focuses its window; opening another opens a new window.
- **Consequences**:
  - The window, the watcher, the file association and the MCP `file` argument all agree on one unit.
  - Several designs mean several windows. A project browser can come later without format changes.
