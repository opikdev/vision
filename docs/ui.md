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

- **Type**: Inter (bundled, not from the network) with `letter-spacing: -0.15px` everywhere; 13px base, 12px for secondary text. JetBrains Mono, with no letter spacing, for paths, ids and token names. Tabular figures for numbers.
- **Color**: these tokens only.

  | Token         | Value     | Use                               |
  | ------------- | --------- | --------------------------------- |
  | `bg`          | `#1C1C1C` | Window frame: sidebar and top bar |
  | `canvas`      | `#161616` | The canvas inset                  |
  | `hover`       | `#262626` | Hover fill                        |
  | `active`      | `#2B2B2B` | Selected row, pressed             |
  | `line`        | `#2A2A2A` | Hairlines                         |
  | `line-strong` | `#333333` | Separators, menu border           |
  | `popover`     | `#232323` | Menus, tooltips, the error strip  |
  | `ink`         | `#E5E5E5` | Text                              |
  | `ink-subtle`  | `#A1A1A1` | Secondary text and icons          |
  | `red`         | `#F87171` | Errors                            |
  | `red-tint`    | `#341C1C` | Error badge fill                  |
  | `focus`       | `#60A5FA` | Focus ring                        |

- **Icons**: Hugeicons (`@hugeicons/react` with `@hugeicons/core-free-icons`), stroke 1.5, 16px in rows and buttons. No other icon set.
- **Radii**: 6px for buttons and badges, 8px for rows and inner blocks, 12px for the canvas, cards and menus. No other radii.
- **Primary button**: `ink` fill with `bg` text. Everything else is a quiet button: text or icon in `ink-subtle`, `hover` fill on hover.
- **Layout**: no border around the main area. The sidebar (248px) and the 48px top bar form one `bg` frame; the canvas is inset 8px from the window's right and bottom edges (and left, when the sidebar is hidden) with 12px corners. The traffic lights, the app icon and the sidebar toggle share the top row.
- **Sidebar toggle**: `Layout2Column` while the sidebar shows, `LayoutAlignLeft` while it's hidden; ⌘\ toggles it. A vertical separator follows it.
- **Zoom**: zoom out, the zoom level, zoom in and an icon-only "Zoom to fit" (`FitToScreen`), right-aligned in the top bar.
- **States**: every interactive element has hover, pressed, disabled and a visible focus ring. Nothing moves focus on its own, and redraws on save never steal focus or reset the viewport.
- **Copy**: sentence case, plain words, specific button labels ("New design", "Copy path"), and errors that say what happened and how to fix it.
