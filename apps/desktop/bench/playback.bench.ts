import { _electron, test, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { recordingSchema, replay, save } from './recording';
import { playbackMetrics, type Trace } from './playback-metrics';

const appDir = resolve(__dirname, '..');
const recordingPath = resolve(__dirname, 'recordings/onboarding.json');
const speed = Number(process.env.VISION_BENCH_REPLAY_SPEED ?? '1');
const videoDir = process.env.VISION_BENCH_VIDEO_DIR;
const label = process.env.VISION_BENCH_LABEL ?? 'playback';
const settleMs = 3000;

const quietWindows = `
const { app } = require('electron');
app.on('browser-window-created', (_event, window) => {
  window.setOpacity(0);
  window.show = () => window.showInactive();
});
`;

test.setTimeout(0);

test('replays an AI session', async () => {
  const recording = recordingSchema.parse(JSON.parse(await readFile(recordingPath, 'utf8')));
  const dir = await mkdtemp(join(tmpdir(), 'vision-playback-'));
  try {
    const hook = join(dir, 'quiet-windows.cjs');
    await writeFile(hook, quietWindows);
    const file = join(dir, 'replay.vis');
    const socket = join(dir, 'activity.sock');
    await save(file, recording.start);
    const app = await _electron.launch({
      args: ['-r', hook, appDir, `--user-data-dir=${join(dir, 'user-data')}`, file],
      env: { ...process.env, VISION_ACTIVITY_SOCKET: socket },
    });
    try {
      const window = await app.firstWindow();
      await window.locator('iframe[data-artboard-id]').first().waitFor({ state: 'attached' });
      await startTrace(window);
      const stopVideo =
        videoDir === undefined ? undefined : await startVideo(window, join(dir, 'frames'));
      const marks: Promise<void>[] = [];
      await replay(recording, {
        file,
        socket,
        speed,
        onStep: (_step, index) => {
          if (index === 0) marks.push(mark(window, 'startedAt'));
        },
      });
      await Promise.all([...marks, mark(window, 'doneAt')]);
      await window.waitForTimeout(settleMs);
      if (videoDir !== undefined) await stopVideo?.(join(videoDir, `${label}.webm`));
      const trace = await window.evaluate(() => (window as unknown as TracedWindow).trace);
      report(playbackMetrics(trace));
    } finally {
      await app.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

interface TracedWindow {
  trace: Trace;
}

// Self-contained, since it runs in the page: logs when design elements appear or change, when
// artboards are drawn, and where the agent's cursor is on every frame.
function startTrace(window: Page): Promise<void> {
  return window.evaluate(() => {
    const trace: Trace = { startedAt: null, doneAt: null, changes: [], artboards: [], cursor: [] };
    (window as unknown as TracedWindow).trace = trace;
    const watched = new WeakSet<Document>();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const value = (record.target as Element).getAttribute('data-reveal');
        if (value === 'added' || value === 'changed') trace.changes.push(performance.now());
      }
    });
    const tick = () => {
      for (const frame of document.querySelectorAll<HTMLIFrameElement>(
        'iframe[data-artboard-id]',
      )) {
        const doc = frame.contentDocument;
        if (doc === null || watched.has(doc)) continue;
        watched.add(doc);
        trace.artboards.push(performance.now());
        observer.observe(doc, {
          subtree: true,
          attributes: true,
          attributeFilter: ['data-reveal'],
        });
      }
      const label = [
        ...document.querySelectorAll('[aria-label="Canvas"] [aria-hidden="true"] span'),
      ]
        .find((span) => span.textContent === 'Claude Code')
        ?.getBoundingClientRect();
      if (label !== undefined) {
        trace.cursor.push({ at: performance.now(), x: label.left, y: label.top });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function mark(window: Page, moment: 'startedAt' | 'doneAt'): Promise<void> {
  await window.evaluate((moment) => {
    (window as unknown as TracedWindow).trace[moment] = performance.now();
  }, moment);
}

// Playwright's recordVideo stalls Electron windows that show on ready-to-show, so this records
// the window's own screencast and encodes it with ffmpeg.
async function startVideo(
  window: Page,
  framesDir: string,
): Promise<(out: string) => Promise<void>> {
  await mkdir(framesDir, { recursive: true });
  const cdp = await window.context().newCDPSession(window);
  const frames: { file: string; at: number }[] = [];
  const pending: Promise<unknown>[] = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = join(framesDir, `${String(frames.length).padStart(6, '0')}.jpg`);
    frames.push({ file, at: metadata.timestamp ?? 0 });
    pending.push(
      writeFile(file, data, 'base64'),
      cdp.send('Page.screencastFrameAck', { sessionId }),
    );
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80 });
  return async (out) => {
    await cdp.send('Page.stopScreencast');
    await Promise.all(pending);
    const list = frames.flatMap(({ file, at }, index) => [
      `file '${file}'`,
      `duration ${((frames[index + 1]?.at ?? at + 0.1) - at).toFixed(4)}`,
    ]);
    const listFile = join(framesDir, 'frames.txt');
    await writeFile(listFile, `${list.join('\n')}\n`);
    await mkdir(resolve(out, '..'), { recursive: true });
    await promisify(execFile)('ffmpeg', [
      ...['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile],
      ...['-vf', 'scale=1440:-2', '-fps_mode', 'vfr', '-c:v', 'libvpx-vp9', '-b:v', '1M', out],
    ]);
  };
}

function report(metrics: ReturnType<typeof playbackMetrics>): void {
  process.stdout.write(
    [
      '',
      `Playback of an AI session (${label}, ${speed}x)`,
      '',
      '| Metric | Value |',
      '| --- | ---: |',
      `| longest still while working (ms) | ${metrics.longestStillMs.toFixed(0)} |`,
      `| longest gap between elements (ms) | ${metrics.longestGapMs.toFixed(0)} |`,
      `| cursor max speed over 100 ms (px/s) | ${metrics.cursorMaxSpeed.toFixed(0)} |`,
      `| cursor longest jump in one frame (px) | ${metrics.cursorLongestJump.toFixed(0)} |`,
      `| elements shown or changed while working | ${metrics.changes} |`,
      '',
    ].join('\n'),
  );
}
