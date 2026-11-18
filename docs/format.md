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

- `id` is unique across the whole document (pages, artboards and nodes share one namespace). It matches `[A-Za-z0-9_][A-Za-z0-9_-]*`: letters, digits, `-` and `_`, not starting with `-`.
- `name` is an optional label for people and AIs reading the file. Vision's layer list shows it; without one, Vision derives a label from the text, image, icon title or id. Give important frames a short `name`, such as "Order summary" or "Checkout button".
- `src` is a path inside the assets folder (`photos/hero.jpg` means `checkout.assets/photos/hero.jpg`) or an `https:` URL. Paths can't leave the assets folder.
- `svg` must be a single `<svg>` element. Scripts, styles, event handlers, `foreignObject` and external references are removed. Use `currentColor` so `text-*` classes tint the icon. An icon written as `<i data-icon>` keeps its name in `data-icon` on the `<svg>`.

## Classes

`class` takes [Tailwind CSS v4](https://tailwindcss.com/docs) utility classes, exactly as in HTML. Everything Tailwind ships works, including arbitrary values (`w-[320px]`, `bg-[#F4F1EA]`) and responsive variants (`md:`, `lg:`, which follow the artboard's width). `dark:` variants are accepted but Vision v1 draws designs in light mode.

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
- A `font` token naming one of the [bundled fonts](#fonts) draws with that font everywhere: in the app, in screenshots and in reviews. Any other family must be installed on the machine that views the design, and falls back otherwise; list fallbacks.

### Fonts

Vision ships these families (Latin, variable unless noted), so name them in `font` tokens, such as `"display": "Fraunces, Georgia, serif"`:

| Family                | Weights  | Italic | Character                                                                  |
| --------------------- | -------- | ------ | -------------------------------------------------------------------------- |
| `Inter`               | 100–900  | yes    | Neutral, very legible UI sans; the safe default for dense product screens. |
| `Geist`               | 100–900  | yes    | Crisp, modern grotesk; developer tools and technical products.             |
| `DM Sans`             | 100–1000 | yes    | Friendly, low-contrast geometric; consumer apps.                           |
| `Manrope`             | 200–800  | no     | Open, slightly rounded geometric; calm finance and health products.        |
| `Plus Jakarta Sans`   | 200–800  | yes    | Warm geometric with personality; startups and marketing pages.             |
| `Space Grotesk`       | 300–700  | no     | Quirky, technical grotesk; bold headlines for tech and creative brands.    |
| `IBM Plex Sans`       | 100–700  | yes    | Engineered, corporate-technical; enterprise and data-heavy tools.          |
| `Bricolage Grotesque` | 200–800  | no     | Expressive grotesk with optical sizes; characterful headlines.             |
| `Fraunces`            | 100–900  | yes    | Soft, old-style display serif; warm editorial, food and lifestyle.         |
| `Instrument Serif`    | 400 only | yes    | Elegant, condensed display serif; large headlines only.                    |
| `Newsreader`          | 200–800  | yes    | Readable text serif with optical sizes; editorial body and long reading.   |
| `Playfair Display`    | 400–900  | yes    | High-contrast display serif; luxury and fashion headlines.                 |
| `JetBrains Mono`      | 100–800  | yes    | Sturdy coding monospace; code and technical labels.                        |
| `Geist Mono`          | 100–900  | yes    | Clean modern monospace; figures, labels and developer tools.               |

Pick one family for text and at most one for display that fit the product, rather than the same pair every time.

## Validation

Every problem has a severity, a message, the place it occurred (a JSON path, with a line number when known) and, when possible, a fix.

Errors make the file invalid. Vision keeps showing the last valid version, and MCP edits that would add an error are rejected. Errors are:

- a file over 20 MB;
- JSON syntax errors;
- a missing or wrong field, or an unknown field;
- a duplicate or malformed id;
- a malformed token name or value;
- an image `src` that isn't a usable path inside the assets folder or an `https:` URL (for example, it leaves the folder or contains control characters).

Warnings don't stop drawing:

- a class Tailwind doesn't recognise;
- an image file that doesn't exist or can't be read;
- an `svg` that isn't a single `<svg>` element (it isn't drawn);
- overlapping artboards.

## Writing designs with MCP

`vision-mcp` is a stdio MCP server. Every tool except `get_guide` and `find_icons` takes `file`, the absolute path of a `.vis` file. The file doesn't need to exist yet: the first edit creates it with page `page-1` and a 1440×900 artboard `desktop`, then applies the edit.

| Tool              | Purpose                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `get_guide`       | This page.                                                                                         |
| `get_overview`    | Pages, artboards, tokens and problem counts.                                                       |
| `get_tree`        | An outline of the design (3 levels deep unless `depth` is given), or of a page, artboard or frame. |
| `get_node`        | One node, page or artboard as JSON; the markup of svg nodes inside it is summarised.               |
| `create_page`     | Add a page.                                                                                        |
| `create_artboard` | Add an artboard, placed to the right of the others unless `x`/`y` are given.                       |
| `update_artboard` | Rename, move, resize or restyle an artboard.                                                       |
| `write_html`      | Convert HTML with Tailwind classes into nodes inside an artboard or frame.                         |
| `update_node`     | Change a node's `class`, `text`, `src`, `alt`, `svg` or `name`.                                    |
| `move_node`       | Move a node to another parent or position.                                                         |
| `delete`          | Remove a node, artboard or page by id.                                                             |
| `find_icons`      | Icon names for `<i data-icon>` that match a word or two, such as `cart` or `arrow left`.           |
| `set_tokens`      | Merge tokens; `null` deletes one.                                                                  |
| `validate`        | List every error and warning.                                                                      |
| `screenshot`      | A PNG of an artboard, rendered by Vision, at most 2000 px on its longest side.                     |
| `review`          | Problems people would see, measured as Vision draws the design, with a score and a fix for each.   |
| `get_selection`   | The layer the user selected in the Vision app, with its label, artboard, page and fields.          |

### HTML for `write_html`

| Elements                                                                                                    | Node                                                 |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `div`, `section`, `header`, `nav`, `main`, `footer`, `aside`, `article`, `form`, `ul`, `ol`, `li`, `button` | `frame`                                              |
| `p`, `span`, `h1`–`h6`, `label`, `a`, `strong`, `em`, `small`                                               | `text` (its text content; `<br>` is a line break)    |
| `img`                                                                                                       | `image` (`src`, `alt`)                               |
| `svg`                                                                                                       | `svg` (its markup)                                   |
| `i` with `data-icon`                                                                                        | `svg` drawing that icon (see [Icons](#icons))        |
| `input`, `textarea`, `select`                                                                               | `frame` showing the `placeholder` or `value` as text |

`class` and `id` attributes are kept, and `data-name`, `aria-label` or `title` (the first one set) becomes the node's `name`; other attributes are dropped. Missing ids are generated from the tag (`div-1`, `h1-2`), and an `id` that's already used is an error. Whitespace collapses as in a browser.

- A frame's bare text becomes a text node.
- Inline formatting inside text (`b`, `i`, `u`, `s`, `code`, `mark`, `sub`, `sup`, `time`) keeps only its text; on its own it becomes a text node like `span`.
- A text element that holds an image, an SVG or a block element, such as `<a class="flex gap-2"><svg>…</svg>Back</a>`, becomes a frame instead.
- An `<svg>`'s `class` and `id` move to its node.
- `style` attributes, `<script>`, `<style>` and other elements (`table`, `hr`, …) are errors; use `div`s with Tailwind classes.

### Icons

Write an icon by name instead of drawing its SVG: `<i data-icon="shopping-cart-01" class="size-5 text-fg-muted"></i>`. The server swaps in the icon from [Hugeicons](https://hugeicons.com) (the free set of about 6,000, MIT): an `svg` node with your `class` and `id`, `currentColor` strokes 1.5 wide, the name in `data-icon`, and a `name` such as "Shopping cart" unless you give a `data-name`. The file stays self-contained, since the node holds the full SVG.

- Size icons with `size-*` and tint them with `text-*`.
- Names are kebab-case, such as `home-01`, `credit-card`, `arrow-right-01` or `user`; common names from other icon sets, such as `house`, `x` or `chevron-down`, also work. Call `find_icons` to search.
- An unknown name is an error that suggests the three closest names, and nothing is written.
- Pick an icon that matches each item, and keep one family: don't mix named icons with hand-drawn SVG ones.

### Designing well

- **Start from a brief.** Decide who it's for, the platform and one word for the feel, then set the colors, fonts and radii that follow from it with `set_tokens`: a palette that comes from this product's subject and audience, so two different products never share a look (don't fall back to any house palette), and one distinctive element, such as a typeface or a shape, carried through every screen. Use the token classes (`bg-brand`, `text-muted`) instead of raw values.
- **One focal point per screen.** Give one primary action the strongest color; make the others outlined or plain text, and keep destructive actions quiet until they're confirmed.
- **Space on a 4/8 scale**: Tailwind steps 1, 2, 3, 4, 6, 8, 12, 16 and up. Avoid half steps (`py-2.5`, `gap-1.5`) and arbitrary pixels.
- **A small type scale.** At most 2 font families and about 5 sizes per artboard, nothing under 12px, body text 16px on phones. Keep muted and colored text at 4.5:1 contrast with its background.
- **Phones**: tap targets of at least 44 × 44px (`size-11`, `min-h-11`), and the main action in view without scrolling, such as in a bottom bar.
- **Real content.** Names, prices, dates and copy that fit the brief, and images or icons that match each item rather than one icon repeated; never lorem ipsum or `Title`.
- **Design the states**: empty, loading, error, selected and disabled, as their own artboards or side by side.
- **Fit the artboard** to its content: make it as tall as the content, with no empty band at the bottom.

### A good loop

1. Call `get_guide` once, then `get_overview`.
2. Set colors, fonts, radii and shadows with `set_tokens`.
3. Build the first screen in the starting artboard `desktop`: rename or resize it with `update_artboard` if it should be something else, such as a 390×844 phone screen. Add more screens with `create_artboard`. Build each artboard section by section with `write_html`, with a `data-name` on important elements (`<div data-name="Order summary">`).
4. Check with `validate`, then `review`: fix every error it finds and the warnings that matter, and review again until no errors are left. Then look at each artboard with `screenshot` for what a review can't judge, such as hierarchy, alignment and whether it meets the brief, and refine with `update_node`. Screenshots are scaled down to at most 2000 px on the longest side, so check tall pages section by section, or as narrower artboards.
5. When the user talks about "the selected layer", "this" or "the selection", call `get_selection` to see what they selected in Vision, then edit it by its `id`.
