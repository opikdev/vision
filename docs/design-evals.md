# Measure design quality

The design eval asks headless Claude Code to design six fixed briefs with only the `vision-mcp` tools, then [reviews](review.md) and screenshots each result. Run it before and after changing the guide or the tools to see whether AI-made designs got better. It isn't part of CI: it costs money and its results vary from run to run.

## Run it

1. Log in to the [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) (`claude`) on this machine.
2. Build what the AI and the scoring use:

   ```sh
   pnpm --filter @vision/mcp build
   pnpm --filter @vision/desktop build
   ```

3. Run a round, naming the folder for its results:

   ```sh
   pnpm eval:design --out=<results folder> --round=<name>
   ```

Each brief runs in a fresh temporary folder with only the `vision` MCP server (`--strict-mcp-config`, no built-in tools, no user settings, skills or slash commands), two at a time. A failed run is retried once.

| Option             | Default                            | Description                                                                                   |
| ------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `--out`            | required                           | Folder for results; each round writes to `<out>/<round>/`.                                    |
| `--round`          | required                           | Name of this round, such as `baseline` or `after`.                                            |
| `--briefs`         | all                                | Comma-separated brief names from `evals/design/briefs/`, such as `pricing,landing`.           |
| `--step`           | `all`                              | `generate` only runs the AI, `score` only reviews and screenshots an earlier round's designs. |
| `--model`          | `sonnet`                           | The Claude model that designs.                                                                |
| `--max-turns`      | `150`                              | Turn limit per run.                                                                           |
| `--max-budget-usd` | `10`                               | Spending limit per run.                                                                       |
| `--concurrency`    | `2`                                | Briefs run at once.                                                                           |
| `--mcp`            | `packages/mcp/dist/vision-mcp.mjs` | The MCP server the AI uses, to compare against a saved build.                                 |
| `--mcp-app`        | `apps/desktop`                     | The app folder that server runs for screenshots and reviews.                                  |

Scoring always uses the app built in `apps/desktop`, so every round is scored by the same rules: re-score older rounds with `--step=score` after changing them.

## Read the results

| File                                   | Contents                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `<round>/summary.md`                   | Score, errors, warnings, nodes, artboards, turns, cost and time per brief, and errors / warnings per rule. |
| `<round>/<brief>/design.vis`           | The design.                                                                                                |
| `<round>/<brief>/review.json`          | Every finding and the scores.                                                                              |
| `<round>/<brief>/screenshots/<id>.png` | Each artboard, at most 2000 px on its longest side.                                                        |
| `<round>/<brief>/transcript-<n>.jsonl` | The AI's full session, one JSON event per line.                                                            |
| `<round>/<brief>/run.json`             | Model, turns, cost and duration of the kept attempt.                                                       |

Look at the screenshots, not only the scores: the review can't judge hierarchy, taste or whether the brief was met. One run per brief is noisy, so treat a few points of difference as noise.

## Add a brief

Add `evals/design/briefs/<name>.md` with a fictional brand and real-sounding content (no lorem ipsum), the audience, the platform and artboard size, and the must-have content. Leave out visual style, so the eval measures the AI's own design sense.
