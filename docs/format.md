# The `.vis` format

A `.vis` file is one UI design stored as UTF-8 JSON. Vision draws it and redraws it on every save. AIs edit it through the `vision-mcp` tools, and the `get_guide` tool returns this page verbatim.

## Files

```
checkout.vis         the design
checkout.assets/     images referenced by the design (optional)
```

- Vision writes files deterministically: keys in a fixed order, tokens sorted by name, 2-space indentation, and a trailing newline. Empty optional fields (`name`, `class`, `alt`, a frame's `children`) are left out. Writes are atomic (temp file, then rename).
- Unknown fields are errors, so typos never pass silently.

## Document

```json
{
  "format": "vision",
  "version": 1,
  "tokens": {
    "color": { "brand": "#1F3D2B", "surface": "#F2EFE8", "fg": "#1C1C1A", "fg-muted": "#6B6B66" },
    "font": { "sans": "Inter, system-ui, sans-serif" },
    "radius": { "card": "12px" },
    "shadow": { "card": "0 2px 6px rgb(0 0 0 / 0.08)" }
  },
  "pages": [
    {
      "id": "checkout",
      "name": "Checkout",
      "artboards": [
        {
          "id": "cart",
          "name": "Cart",
          "x": 0,
          "y": 0,
          "width": 1440,
          "height": 900,
          "class": "bg-white font-sans text-fg",
          "children": []
        }
      ]
    }
  ]
}
```

| Field     | Type       | Notes                            |
| --------- | ---------- | -------------------------------- |
| `format`  | `"vision"` | Required.                        |
| `version` | `1`        | Required.                        |
| `tokens`  | object     | Optional. See [Tokens](#tokens). |
| `pages`   | array      | At least one page.               |

### Pages and artboards

| Field                      | Type   | Notes                                                                                                                                                      |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| page `id`, `name`          | string |                                                                                                                                                            |
| page `artboards`           | array  | May be empty.                                                                                                                                              |
| artboard `id`, `name`      | string |                                                                                                                                                            |
| artboard `x`, `y`          | number | Position on the page's canvas, in px. Artboards should not overlap.                                                                                        |
| artboard `width`, `height` | number | Size in px, from 1 to 10000. The artboard is the viewport its content is laid out in, so responsive classes such as `md:flex` follow the artboard's width. |
| artboard `class`           | string | Optional. Classes for the artboard's root box, such as a background.                                                                                       |
| artboard `children`        | array  | The artboard's nodes.                                                                                                                                      |

## Nodes

| `type`  | Fields                                 | Renders as                                      |
| ------- | -------------------------------------- | ----------------------------------------------- |
| `frame` | `id`, `name`?, `class`?, `children`?   | A `<div>` that lays out its children.           |
| `text`  | `id`, `name`?, `class`?, `text`        | A `<p>`. `\n` starts a new line.                |
| `image` | `id`, `name`?, `class`?, `src`, `alt`? | An `<img>`.                                     |
| `svg`   | `id`, `name`?, `class`?, `svg`         | Inline SVG markup, for icons and illustrations. |

- `id` is unique across the whole document (pages, artboards and nodes share one namespace). It matches `[A-Za-z0-9_-]+`.
- `name` is an optional label shown in Vision's layer list.
- `src` is a path inside the assets folder (`photos/hero.jpg` means `checkout.assets/photos/hero.jpg`) or an `https:` URL. Paths can't leave the assets folder.
- `svg` must be a single `<svg>` element. Scripts, event handlers, `foreignObject` and external references are removed. Use `currentColor` so `text-*` classes tint the icon.

## Classes

`class` takes [Tailwind CSS v4](https://tailwindcss.com/docs) utility classes, exactly as in HTML. Everything Tailwind ships works, including arbitrary values (`w-[320px]`, `bg-[#F4F1EA]`), responsive variants (`md:`, `lg:`, which follow the artboard's width) and `dark:` (which follows the theme Vision shows).

- Layout is real CSS. Use `flex`, `grid`, `gap-*`, `p-*`, `w-*`, `h-*` and so on, just like a web page.
- Give an artboard's top frame `h-full` or `min-h-full` when it should fill the artboard.
- Classes Tailwind doesn't recognise are warnings, with the closest valid class as a suggestion. They don't stop the design from drawing.
- Prefer token classes (`bg-brand`) to raw values (`bg-[#1F3D2B]`) so the design stays consistent.

## Tokens

Tokens become Tailwind theme variables, so each one creates classes:

| Group     | Example token                            | Example classes                                   |
| --------- | ---------------------------------------- | ------------------------------------------------- |
| `color`   | `"fg-muted": "#6B6B66"`                  | `text-fg-muted`, `bg-fg-muted`, `border-fg-muted` |
| `font`    | `"sans": "Inter, system-ui, sans-serif"` | `font-sans`                                       |
| `text`    | `"title": "28px"`                        | `text-title`                                      |
| `radius`  | `"card": "12px"`                         | `rounded-card`                                    |
| `shadow`  | `"card": "0 2px 6px rgb(0 0 0 / 0.08)"`  | `shadow-card`                                     |
| `spacing` | `"gutter": "24px"`                       | `p-gutter`, `gap-gutter`                          |

- Token names match `[a-z0-9]+(-[a-z0-9]+)*`.
- Values are CSS values: colors in any CSS color syntax, lengths with units (`text`, `radius` and `spacing` need a unit, such as `12px`). Values can't contain `;`, `{`, `}` or `/*`.
- Tokens extend Tailwind's default theme. A token with a default's name (such as `color.red-500`) replaces it.
- Fonts must be installed on the machine that views the design; list fallbacks.

## Validation

Every problem has a severity, a message, the place it occurred (a JSON path, with a line number when known) and, when possible, a fix.

Errors make the file invalid. Vision keeps showing the last valid version, and MCP edits that would add an error are rejected. Errors are:

- JSON syntax errors;
- a missing or wrong field, or an unknown field;
- a duplicate or malformed id;
- a malformed token name or value;
- an image `src` that leaves the assets folder.

Warnings don't stop drawing:

- a class Tailwind doesn't recognise;
- an image file that doesn't exist;
- overlapping artboards.

## Writing designs with MCP

`vision-mcp` is a stdio MCP server. Every tool takes `file`, the absolute path of a `.vis` file. The file doesn't need to exist yet; the first edit creates it.

| Tool              | Purpose                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| `get_guide`       | This page.                                                                   |
| `get_overview`    | Pages, artboards, tokens and problem counts.                                 |
| `get_tree`        | An outline of a page or an artboard.                                         |
| `get_node`        | One node, page or artboard as JSON.                                          |
| `create_page`     | Add a page.                                                                  |
| `create_artboard` | Add an artboard, placed to the right of the others unless `x`/`y` are given. |
| `update_artboard` | Rename, move, resize or restyle an artboard.                                 |
| `write_html`      | Convert HTML with Tailwind classes into nodes inside an artboard or frame.   |
| `update_node`     | Change a node's `class`, `text`, `src`, `alt`, `svg` or `name`.              |
| `move_node`       | Move a node to another parent or position.                                   |
| `delete`          | Remove a node, artboard or page by id.                                       |
| `set_tokens`      | Merge tokens; `null` deletes one.                                            |
| `validate`        | List every error and warning.                                                |
| `screenshot`      | A PNG of an artboard, rendered by Vision.                                    |

### HTML for `write_html`

| Elements                                                                                                    | Node                                                 |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `div`, `section`, `header`, `nav`, `main`, `footer`, `aside`, `article`, `form`, `ul`, `ol`, `li`, `button` | `frame`                                              |
| `p`, `span`, `h1`–`h6`, `label`, `a`, `strong`, `em`, `small`                                               | `text` (its text content; `<br>` is a line break)    |
| `img`                                                                                                       | `image` (`src`, `alt`)                               |
| `svg`                                                                                                       | `svg` (its markup)                                   |
| `input`, `textarea`, `select`                                                                               | `frame` showing the `placeholder` or `value` as text |

`class` and `id` attributes are kept and missing ids are generated. A frame's bare text becomes a text node. `style` attributes and scripts are not allowed.

### A good loop

1. Call `get_guide` once, then `get_overview`.
2. Set colors, fonts, radii and shadows with `set_tokens`.
3. Add an artboard with `create_artboard`, then build it section by section with `write_html`.
4. Check with `validate` and `screenshot`, then refine with `update_node`.
