# Measure design quality

The design eval asks headless Claude Code to design six fixed briefs with only the `vision-mcp` tools, then [reviews](review.md) and screenshots each result and has a visual judge score each screenshot. Run it before and after changing the guide or the tools to see whether AI-made designs got better, faster or cheaper. It isn't part of CI: it costs money and its results vary from run to run, so it runs each brief more than once.

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

Each run of a brief gets a fresh temporary folder with only the `vision` MCP server (`--strict-mcp-config`, no built-in tools, no user settings, skills or slash commands), two at a time. A failed run is retried once.

| Option             | Default                            | Description                                                                         |
| ------------------ | ---------------------------------- | ----------------------------------------------------------------------------------- |
| `--out`            | required                           | Folder for results; each round writes to `<out>/<round>/`.                          |
| `--round`          | required                           | Name of this round, such as `baseline` or `after`.                                  |
| `--briefs`         | all                                | Comma-separated brief names from `evals/design/briefs/`, such as `pricing,landing`. |
| `--runs`           | `2`                                | Runs per brief.                                                                     |
| `--step`           | `all`                              | See [Steps](#steps).                                                                |
| `--repeats`        | `3`                                | How often `--step=calibrate` judges each screenshot.                                |
| `--model`          | `sonnet`                           | The Claude model that designs and judges.                                           |
| `--max-turns`      | `150`                              | Turn limit per run.                                                                 |
| `--max-budget-usd` | `10`                               | Spending limit per run.                                                             |
| `--concurrency`    | `2`                                | Runs at once.                                                                       |
| `--mcp`            | `packages/mcp/dist/vision-mcp.mjs` | The MCP server the AI uses, to compare against a saved build.                       |
| `--mcp-app`        | `apps/desktop`                     | The app folder that server runs for screenshots and reviews.                        |

Scoring always uses the app built in `apps/desktop`, so every round is scored by the same rules: re-score older rounds with `--step=score` after changing them.

### Steps

| Step        | Does                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `all`       | Generates, reviews, screenshots and judges every run.                                                        |
| `generate`  | Only runs the AI.                                                                                            |
| `score`     | Reviews, screenshots and judges an earlier round's designs.                                                  |
| `judge`     | Only judges an earlier round's screenshots.                                                                  |
| `summary`   | Only writes `summary.md` again from an earlier round's files.                                                |
| `calibrate` | Judges the first screenshot of each brief's first run `--repeats` times, to show how much the judge wobbles. |

### Visual judge

The review checks rules, not taste, and saturates near 100. The judge sends each artboard's screenshot and the brief to headless Claude (`claude -p`, the same model, no tools) with the fixed rubric in [`evals/design/judge.md`](../evals/design/judge.md): hierarchy, typography, color, spacing, polish and fit to the brief, each 1–10 with a short reason. A run's judge score is the mean of the six criteria over its artboards. One judgement costs about $0.03, and a failed one is retried once; the summary shows the judge's total cost apart from the designs'.

## Read the results

| File                                                 | Contents                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<round>/summary.md`                                 | Per brief and for all runs, the mean ± the standard deviation between runs of the review score, judge score, errors, warnings, nodes, time, output, input and cache-read tokens, cost, turns, `write_html` calls, elements per call and the share of written HTML that is inline SVG; judge scores per criterion; errors / warnings per rule. |
| `<round>/calibration.md`                             | Judge scores of repeated judgements, from `--step=calibrate`.                                                                                                                                                                                                                                                                                 |
| `<round>/<brief>/run-<n>/design.vis`                 | The design.                                                                                                                                                                                                                                                                                                                                   |
| `<round>/<brief>/run-<n>/review.json`                | Every finding and the scores.                                                                                                                                                                                                                                                                                                                 |
| `<round>/<brief>/run-<n>/judge.json`                 | The judge's scores and reasons per artboard, and their cost.                                                                                                                                                                                                                                                                                  |
| `<round>/<brief>/run-<n>/screenshots/`               | Each artboard as `<id>.png`, at most 2000 px on its longest side.                                                                                                                                                                                                                                                                             |
| `<round>/<brief>/run-<n>/transcript-<attempt>.jsonl` | The AI's full session, one JSON event per line.                                                                                                                                                                                                                                                                                               |
| `<round>/<brief>/run-<n>/run.json`                   | Model, turns, cost, duration, tokens and `write_html` statistics of the kept attempt.                                                                                                                                                                                                                                                         |

Look at the screenshots, not only the scores: neither the review nor the judge is a designer. Treat a difference smaller than the spread between runs, or than the judge's calibration spread, as noise.

## Add a brief

Add `evals/design/briefs/<name>.md` with a fictional brand and real-sounding content (no lorem ipsum), the audience, the platform and artboard size, and the must-have content. Leave out visual style, so the eval measures the AI's own design sense.
