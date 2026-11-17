# 004. Every MCP tool takes the file path

- **Status**: accepted
- **Context**: A server bound to one file at startup has to be registered again for every new design, which is friction for the main use: asking any AI to design something.
- **Decision**: `vision-mcp` takes no arguments, and every tool takes `file`, an absolute `.vis` path. A missing file is treated as an empty design and created on the first edit.
- **Consequences**:
  - One registration per AI client serves every design.
  - The AI must know the path; Vision's "Copy path" and "Connect an AI" actions give it.
