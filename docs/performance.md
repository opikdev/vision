# Measure performance

## Run the benchmark

```sh
pnpm bench
```

This builds the app, then runs the benchmarks in [`apps/desktop/bench`](../apps/desktop/bench) with Playwright: `canvas.bench.ts` for big designs and `playback.bench.ts` for [agent playback](#replay-an-ai-session). Name one to run only it, such as `pnpm bench canvas`. For each size, the canvas benchmark generates a seeded stress design in a temp folder, opens it in the built app 5 times and prints a table of the median and p95 of each metric. The windows are shown without focus and fully transparent, so you can keep working while it runs. A full run takes about 3.5 minutes.

| Variable             | Default                | Description                                   |
| -------------------- | ---------------------- | --------------------------------------------- |
| `VISION_BENCH_SIZES` | `medium,large`         | Comma-separated sizes to run.                 |
| `VISION_BENCH_RUNS`  | `5`                    | App launches per size.                        |
| `VISION_BENCH_OUT`   | `$TMPDIR/vision-bench` | Folder for the `bench-<time>.json` and `.md`. |

| Size     | Artboards | Nodes per artboard | Nodes  |
| -------- | --------- | ------------------ | ------ |
| `medium` | 8         | 300                | 2,400  |
| `large`  | 30        | 1,000              | 30,000 |

Each artboard is a 1440×2400 page of card grids nested 8 levels deep, with Tailwind classes, inline SVG icons and three local PNGs ([`stress-design.ts`](../apps/desktop/bench/stress-design.ts)).

## Read the numbers

| Metric                                 | What it measures                                                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`                                 | From the app being ready to every artboard on screen showing its nodes, styles and images, at the fitted zoom.                                                                                                      |
| `memory … all processes`               | Sum of the working sets of every Electron process, after 1.5 s idle.                                                                                                                                                |
| `memory … renderer JS heap`            | The window's JS heap after a forced garbage collection.                                                                                                                                                             |
| `save, edit 1 node`                    | From the file being replaced (temp file, then rename) to the new text being in the artboard's DOM. Includes main's 75 ms debounce.                                                                                  |
| `save, add 50 nodes`                   | The same, for a frame with 49 new text nodes and new classes at the top of the first artboard.                                                                                                                      |
| `zoom`, `pan at 100%`                  | Frame times from `requestAnimationFrame` while the page sends a wheel event every frame for 2 s: ⌘-scroll in and out from the fitted zoom, and scroll right and back at 100%. A 120 Hz display gives 8.3 ms frames. |
| `layers, select … at depth 7`          | From a click on a badge label inside a card to its row being selected in the layer tree.                                                                                                                            |
| `layers, expand every artboard`        | Clicking the chevron of each artboard row in turn until its first child row shows.                                                                                                                                  |
| `zoom to fit from 100%`                | From a click on Zoom to fit, after the pan, to every artboard showing again.                                                                                                                                        |
| `zoom to fit from 100%, longest frame` | The longest frame meanwhile, from `requestAnimationFrame`.                                                                                                                                                          |

Times include Playwright's round trips, a few ms each, so compare runs on the same machine rather than reading them as absolute costs. Close other heavy apps first: the numbers move by 10–20% with background load. CI doesn't run the benchmark, because shared runners are too slow and noisy for fixed budgets: run it before and after any change to drawing, saving or the canvas, and put both tables in the pull request.

## Replay an AI session

[`bench/recordings/onboarding.json`](../apps/desktop/bench/recordings/onboarding.json) is a real session of Claude Code designing a three-screen onboarding: each step is the delay since the previous one, the file it saved (if any) and the activity `vision-mcp` sent. Replay it into the app you're running:

```sh
pnpm dev
pnpm replay apps/desktop/bench/recordings/onboarding.json
```

It writes the first snapshot to a temp `.vis` (or `--file <path>`), waits until you open that file in Vision, then saves each snapshot and sends each activity over the activity socket (`VISION_ACTIVITY_SOCKET`, or the default) as `vision-mcp` does. `--speed 4` plays it 4 times faster.

`pnpm bench playback` replays the same session in the built app and prints:

| Metric                                  | What it measures                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| longest still while working             | The longest time with no element shown or changed and no artboard drawn, from the first activity to `done`. |
| longest gap between elements            | The same, between the first and the last element shown.                                                     |
| cursor max speed over 100 ms            | The agent cursor's fastest move on screen, over windows of at least 100 ms.                                 |
| cursor longest jump in one frame        | Its longest move between two frames: a teleport shows up here.                                              |
| elements shown or changed while working | How many reveals happened before `done`.                                                                    |

| Variable                    | Default    | Description                                                                 |
| --------------------------- | ---------- | --------------------------------------------------------------------------- |
| `VISION_BENCH_REPLAY_SPEED` | `1`        | How many times faster than the agent to replay.                             |
| `VISION_BENCH_VIDEO_DIR`    |            | Folder to save a video of the window to, as `<label>.webm`; needs `ffmpeg`. |
| `VISION_BENCH_LABEL`        | `playback` | Name of the run in the table and the video file.                            |

To record another session, convert the stream-JSON transcript of a Claude Code run that used `vision-mcp`, such as a [design eval](design-evals.md)'s `transcript-1.jsonl`. It re-applies each edit with `@vision/format` and times the steps from the transcript's timestamps:

```sh
pnpm replay:record <transcript.jsonl> <recording.json>
```

## Profile a slow metric

Open a Chrome DevTools Protocol session on the window in a scratch copy of the benchmark and wrap the step in `Profiler.start` and `Profiler.stop`:

```ts
const cdp = await window.context().newCDPSession(window);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.start');
// the step to profile
const { profile } = await cdp.send('Profiler.stop');
```

Save `profile` as a `.cpuprofile` file and open it in Chrome DevTools' Performance panel. Main-process work (reading, parsing and validating the file) doesn't show there; time it with a Vitest test that calls `readDesign` on a generated design.
