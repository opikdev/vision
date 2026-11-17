# 002. Style designs with Tailwind v4 and draw each artboard in a sandboxed iframe

- **Status**: accepted
- **Context**: AIs write HTML with Tailwind classes fluently, so a format built on them needs no new styling language. The classes are only known when a file is opened, and artboards must not inherit the app's styles, must respond to their own width, and must never run code from the file.
- **Decision**: Node `class` fields hold Tailwind CSS v4 classes, compiled at runtime by Tailwind's own compiler, with the file's tokens as theme variables. Each artboard renders in an `<iframe sandbox="allow-same-origin">` sized to the artboard; React renders into it through a portal.
- **Consequences**:
  - Every Tailwind utility, arbitrary value and variant works, and validation uses the same compiler, so a class that validates is a class that draws.
  - Responsive variants follow the artboard's width, because the artboard is the iframe's viewport.
  - Without `allow-scripts`, nothing in a design can execute, even if sanitizing misses something.
  - Tailwind upgrades can change how designs look; the version is pinned and upgraded deliberately.
