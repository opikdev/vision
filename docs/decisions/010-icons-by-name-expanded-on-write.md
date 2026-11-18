# 010. Write icons by name and expand them when they're written

- **Status**: accepted
- **Context**: AIs drew every icon as inline SVG in `write_html`: 14% of the HTML they wrote was SVG path data, costing output tokens and time, and the icons were inconsistent. A `.vis` file must stay self-contained, and the app must draw it without knowing any icon set.
- **Decision**: `write_html` accepts `<i data-icon="name">`, and `vision-mcp` replaces it with an ordinary `svg` node holding the Hugeicons free icon (MIT), `currentColor` strokes 1.5 wide, its name in `data-icon` and a readable `name`. `@vision/format` takes the resolver as an option, so the format and the app stay icon-agnostic. The format version doesn't change. Rejected: an `icon` node type or a reference resolved at draw time, which would make every reader, the app and older files depend on one icon set's version.
- **Consequences**:
  - AIs write a few words per icon instead of hundreds of characters of paths, and get one consistent icon family.
  - Files keep working without the server and look the same after an icon set upgrade; changing an icon means writing it again.
  - The server carries the icon shapes, compressed, adding about 1.3 MB to `vision-mcp.mjs`.
  - Outlines show `icon="name"` and `get_node` summarises nested SVG markup, so reading a design doesn't cost the markup's tokens.
