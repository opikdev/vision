# Design review

`reviewDesign` in `@vision/format` checks a design for problems people would see, and scores it. Rules marked _layout_ need the design as Vision draws it, so they run only in the app's [review mode](architecture.md#review-mode); the others also run on the file alone.

## Findings

Each finding has a `rule`, a `severity` (`error`, `warning` or `info`), the `artboardId` and `nodeId` it points at (the artboard's id for artboard-wide findings), a `message` with the measured value and the target, and usually a `fix`.

## Rules

| Rule           | Layout | Reports                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contrast`     | yes    | Error: text below WCAG AA against its background, blending translucent ancestor backgrounds over white: 4.5:1, or 3:1 from 24px (18.66px bold). Info: text over an image or gradient, which can't be measured. Skips emoji, which keep their own colors, and layers whose id or name says `disabled` or `inactive`, or with `cursor-not-allowed`.                                                             |
| `overflow`     | yes    | Error: drawn content (text, images, icons, filled shapes) below the artboard's bottom; an in-flow layer past its left or right edge; text cut off by a parent that hides overflow. Warning: truncated text (ellipsis or line clamp); text wider or taller than its box (vertically by more than a quarter of its font size); a child spilling more than 2px out of its parent. Positioned layers are skipped. |
| `overlap`      | yes    | In-flow siblings overlapping by more than 2px each way: an error when either holds text, else a warning. Skips positioned, transformed and negative-margin layers and grid items placed in the same cell.                                                                                                                                                                                                     |
| `spacing`      | yes    | Warning, once per artboard: padding, margin and gap values above 2px that aren't multiples of 4px, with the worst examples. `auto` margins are ignored.                                                                                                                                                                                                                                                       |
| `type-scale`   | yes    | Warnings: more than 6 font sizes or more than 2 font families in an artboard; text under 12px (once per artboard); wrapped text with a line height under 1.15 (0.95 from 32px) or over 2 times its size.                                                                                                                                                                                                      |
| `radii`        | yes    | Warning: more than 4 corner radii in an artboard, ignoring pills and circles.                                                                                                                                                                                                                                                                                                                                 |
| `tokens`       | no     | Warning, per class and artboard: an arbitrary value equal to a token (`bg-[#1F3D2B]` when `brand` is `#1F3D2B`), with the token class. Info: the design has no color tokens.                                                                                                                                                                                                                                  |
| `touch-target` | yes    | Warning, on artboards up to 480px wide: tappable layers under 44 × 44px. Tappable means an id from `button`, `a`, `input`, `select` or `textarea` (`button-3`), a name or id with a word such as button, link, tab, toggle or checkbox, `cursor-pointer`, or a filled or bordered frame over 28px tall with a label of up to 3 words.                                                                         |
| `content`      | no     | Error: lorem ipsum. Warnings: placeholder copy (`Title`, `Text here`, `Button`, `[Company name]`…), images without alt text, and (layout) empty frames with no size that draw nothing.                                                                                                                                                                                                                        |

## Score

Each artboard, and the whole design, gets a score from 0 to 100:

```
penalty = 5 × errors + 1 × warnings     (info counts 0)
score   = max(0, round(100 − penalty × 100 / max(nodes, 20)))
```

`nodes` counts the frames, texts, images and SVGs reviewed. The score is the penalty per 100 nodes taken from 100, so designs of different sizes compare; the floor of 20 nodes keeps a tiny artboard from swinging on one finding. Changing a rule, a threshold or this formula changes every score, so compare scores only from the same version of the rules.
