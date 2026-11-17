# App UI

The rules for Vision's own interface (not for the designs it shows). The approved screens are in [`design/`](design/).

| Screen                    | Reference                                                   |
| ------------------------- | ----------------------------------------------------------- |
| First launch, no file yet | [01-first-launch.png](design/01-first-launch.png)           |
| New design created        | [02-new-design.png](design/02-new-design.png)               |
| Viewing, redraws on save  | [03-viewing.png](design/03-viewing.png)                     |
| Sidebar hidden            | [04-sidebar-hidden.png](design/04-sidebar-hidden.png)       |
| App menu open             | [05-app-menu.png](design/05-app-menu.png)                   |
| Save has an error         | [06-save-has-an-error.png](design/06-save-has-an-error.png) |

## Rules

- **Type**: Inter (bundled, not from the network) with `letter-spacing: -0.15px` everywhere; 13px base (`text-sm`), 12px for secondary text (`text-xs`), 17px semibold for screen titles (`text-lg`). These are the only sizes; there is no `text-base`. JetBrains Mono, with no letter spacing, for paths, ids and token names. Tabular figures for numbers.
- **Color**: these tokens only. They are shadcn/ui's semantic names, defined in `styles/app.css`; `canvas`, `active`, `border-strong` and `destructive-tint` are ours.

  | Token                                   | Value     | Use                                          |
  | --------------------------------------- | --------- | -------------------------------------------- |
  | `background`, `sidebar`                 | `#1C1C1C` | Window frame: sidebar and top bar            |
  | `canvas`                                | `#161616` | The canvas inset                             |
  | `accent`, `secondary`, `sidebar-accent` | `#262626` | Hover fill, secondary button                 |
  | `active`                                | `#2B2B2B` | Selected row, pressed, highlighted menu item |
  | `border`                                | `#2A2A2A` | Hairlines                                    |
  | `border-strong`                         | `#333333` | Separators, menu border                      |
  | `popover`                               | `#232323` | Menus, tooltips, the error strip             |
  | `foreground`, `primary`, `*-foreground` | `#E5E5E5` | Text, primary button fill                    |
  | `muted-foreground`                      | `#A1A1A1` | Secondary text and icons                     |
  | `primary-foreground`                    | `#1C1C1C` | Text on the primary button                   |
  | `destructive`                           | `#F87171` | Errors                                       |
  | `destructive-tint`                      | `#341C1C` | Error badge fill                             |
  | `ring`                                  | `#60A5FA` | Focus ring                                   |

- **Icons**: Hugeicons (`@hugeicons/react` with `@hugeicons/core-free-icons`), stroke 1.5, 16px in rows and buttons. No other icon set.
- **Radii**: 6px (`rounded-sm`) for buttons and badges, 8px (`rounded-md`) for rows and inner blocks, 12px (`rounded-lg`) for the canvas, cards, menus and dialogs. No other radii are defined.
- **Primary button**: `primary` fill with `primary-foreground` text. Everything else is a quiet button: text or icon in `muted-foreground`, `accent` fill on hover.
- **Layout**: no border around the main area. The sidebar (248px) and the 48px top bar form one `background` frame; the canvas is inset 8px from the window's right and bottom edges (and left, when the sidebar is hidden) with 12px corners. The traffic lights, the app menu (the V mark, 16px after the traffic lights) and the sidebar toggle share the top row.
- **Sidebar toggle**: `LayoutLeft` while the sidebar shows, `LayoutAlignLeft` while it's hidden; ⌘\ toggles it. A vertical separator follows it.
- **Zoom**: zoom out, the zoom level, zoom in and an icon-only "Zoom to fit" (`FitToScreen`), right-aligned in the top bar.
- **States**: every interactive element has hover, pressed, disabled and a visible focus ring (the global 2px `ring` outline, not shadcn's `ring-*` utilities). Nothing moves focus on its own, and redraws on save never steal focus or reset the viewport.
- **Motion**: menus, popovers, tooltips and the dialog fade and zoom in over 100ms, and the sidebar slides over 200ms. With reduced motion, every shadcn component (`[data-slot]`) appears at once.
- **Layers**: the sidebar's "Layers" section is a tree (WAI-ARIA tree view) under "Pages".
  - **Rows**: artboards at the top level with their size in 12px `muted-foreground`; nodes indent 12px per level. Rows are 28px with 8px radius: a 16px chevron slot (`ArrowRight01`/`ArrowDown01` at 12px), a 16px type icon in `muted-foreground` (`foreground` when selected), then the label, cut with an ellipsis. Hover fills `accent`, selected fills `active`.
  - **Type icons**: artboard `Frame`, frame `Square`, text `Text`, image `Image01`, svg `VectorSquare`.
  - **Labels**: a layer's `name`, or one derived by `layerLabel` in `@vision/format` (text, image alt or file name, icon title, meaningful id, or role and first text such as "List · Cortado"). Never a generated id like `div-23`.
  - **Keyboard**: ↑/↓ move, → expands or goes to the first child, ← collapses or goes to the parent, Home/End, Enter/Space select, Escape clears the selection.
  - **Canvas**: hovering a row or an element draws a 1px `ring` outline around it; the selected layer gets a 1.5px `ring` outline and a size chip 6px below it (`ring` fill, `primary-foreground` 12px medium tabular text, 20px tall, 6px radius, design pixels such as `330 × 48`). Clicking an element selects the deepest layer under the pointer, expands its ancestors and scrolls its row into view without moving the viewport; clicking an artboard's name selects the artboard; clicking empty canvas clears. Outlines live above the iframes, never in the design.
  - **Context menu**: right-clicking a row or an element selects it and opens "Zoom to layer" (`ZoomInArea`, ⇧2, also a global shortcut) and "Copy layer id" (`Copy01`, the id in JetBrains Mono where a shortcut would be). Zoom to layer fits the layer with the zoom-to-fit padding.
- **Agent activity**: shown only while an AI works, never moving the viewport on its own.
  - **Cursor**: Hugeicons `Cursor02`, 18px, `background` fill with a `foreground` stroke, and a name pill below-right (`background` fill, `border-strong` border, 6px radius, 20px tall, 12px medium text). It glides 300ms to each new element and stays pinned to the design while you pan or zoom. It's `aria-hidden`; the status carries the meaning.
  - **Status**: after the breadcrumb, a 14px cursor icon and "**Claude Code** is adding 4 elements to Cart" in 12px `muted-foreground`, with the name in `foreground` medium, inside `role="status"`. It replaces "Updated …" while shown, says "is thinking" between steps, and fades after `done` or a minute without messages.
  - **Sidebar**: the artboard row shows a 12px cursor and the agent's name instead of its size.
  - **Looking at a layer**: when an AI calls `get_selection`, its cursor moves to the selected layer.
  - **Reveal**: on every save, each new element fades in and rises 4px over 160ms with a 1.5px `#1C1C1C` outline that fades over 400ms; changed elements get only the outline. Elements follow each other every `min(60ms, 1500ms / count)`, and a newer save finishes the running reveal at once. Nothing is revealed on opening, page switches, screenshots or with reduced motion. Animate only opacity and transform.
  - **Off screen**: when the cursor is outside the canvas, a pill sits 16px in from the nearest edge: `popover` fill, `border-strong` border, 8px radius, 32px tall, menu shadow, "**Claude Code** on Payment" and a chevron pointing to that edge. Clicking it pans, without zooming, to centre the cursor.
- **Copy**: sentence case, plain words, specific button labels ("New design", "Copy path"), and errors that say what happened and how to fix it.

## Components

The interface is built from [shadcn/ui](https://ui.shadcn.com) components (style `base-nova`, on [Base UI](https://base-ui.com) primitives). Their source lives in `apps/desktop/src/renderer/components/ui/` and is ours: each one is restyled to the rules above, and parts and variants we don't use are deleted. `components.json` configures the CLI.

| Part of the app                                         | Component                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| Buttons, icon buttons, the app menu trigger             | `button` (`default` is primary, `secondary`, `ghost` is quiet) |
| Shortcut hints, tooltips, the top bar separator         | `kbd`, `tooltip`, `separator`                                  |
| App menu                                                | `dropdown-menu`                                                |
| Layer menu on rows and the canvas                       | `context-menu`                                                 |
| Connect an AI                                           | `dialog`                                                       |
| Window frame: sidebar, sections, rows, the canvas inset | `sidebar` (`variant="inset"`, slides out when hidden)          |
| Problems, "Save has an error", the error strip          | `popover`, `badge`, `alert`                                    |
| Start screen, "This file can't be drawn yet"            | `empty`                                                        |
| "This design is empty" hint                             | `item`                                                         |

Custom pieces: `components/Icon.tsx` (Hugeicons at stroke 1.5), `components/IconButton.tsx` (an icon `Button` with its `Tooltip`), the setup snippets in Connect an AI, the layer tree (shadcn has no tree), and the canvas, artboard labels, layer outlines and agent cursor.

To add a component:

1. In `apps/desktop`, run `pnpm dlx shadcn@latest add <name>` and answer **No** to overwriting existing files.
2. Restyle it: only the tokens, radii and sizes above, `shadow-popover` and `border-border-strong` for popups, no `ring-*` focus styles, `Icon` instead of `HugeiconsIcon`, `no-drag` on anything that can sit in the top bar.
3. Delete the parts, variants and generated dependencies you don't use.
