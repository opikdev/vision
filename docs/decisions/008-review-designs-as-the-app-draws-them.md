# 008. Review designs as the app draws them

- **Status**: accepted
- **Context**: The problems people see in a design (low contrast, clipped or overlapping text, content past the artboard) depend on real layout: Tailwind classes, fonts, wrapping and images. Reading classes can't tell whether a heading wraps or a row overflows. Only the app lays designs out, and its artboards are sandboxed iframes that must never run a design's code.
- **Decision**: The app gets a review mode beside screenshot mode, `--vision-review=<file.vis> --out=<file.json> [--artboard=<id>]`. An offscreen window draws the artboards exactly as the canvas does, and the renderer measures each node's box, scroll size and computed styles into plain data. Main validates that data with zod and runs the rules, which are pure functions in `@vision/format` over the document and the measurements, then writes the report and exits.
- **Consequences**:
  - Findings match what people see, using the same compiler, fonts and layout as the canvas and screenshots.
  - The rules need no DOM, so they're unit-tested with literal measurements, and the static ones also run without the app.
  - Nothing new runs inside a design: the renderer reads the iframes from outside through `allow-same-origin`, as layer outlines already do; the CSP and sandbox are unchanged.
  - Reviewing needs the app, as screenshots do, and costs about a second per run.
