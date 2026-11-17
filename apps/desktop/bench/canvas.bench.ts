import { _electron, test, type ElectronApplication, type Page } from '@playwright/test';
import { serializeDocument, type FrameNode, type VisionDocument } from '@vision/format';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { cpus, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  artboardHeight,
  artboardId,
  artboardWidth,
  cardTitleId,
  imageNames,
  stressDesign,
  stressImage,
  stressSizes,
  type StressSizeName,
} from './stress-design';
import { formatReport, summarize, type Samples } from './stats';

const appDir = resolve(__dirname, '..');
const runs = Number(process.env.VISION_BENCH_RUNS ?? '5');
const sizes = (process.env.VISION_BENCH_SIZES ?? 'medium,large').split(',') as StressSizeName[];
const outDir = process.env.VISION_BENCH_OUT ?? join(tmpdir(), 'vision-bench');
const gestureMs = 2000;
const settleMs = 1500;

// Shows the window without focusing it and keeps it fully transparent, so a bench run never
// covers the screen; Playwright already stops Chromium from throttling occluded windows.
const quietWindows = `
const { app } = require('electron');
app.on('browser-window-created', (_event, window) => {
  window.setOpacity(0);
  window.show = () => window.showInactive();
});
`;

const results: Partial<Record<StressSizeName, Samples>> = {};

test.describe.configure({ mode: 'serial' });
test.setTimeout(0);

for (const size of sizes) {
  test(size, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-bench-'));
    try {
      const hook = join(dir, 'quiet-windows.cjs');
      await writeFile(hook, quietWindows);
      const file = join(dir, 'stress.vis');
      for (const [index, name] of imageNames.entries()) {
        const path = join(dir, 'stress.assets', name);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, stressImage(index));
      }
      const design = stressDesign(stressSizes[size]);
      const samples: Samples = {};
      for (let run = 0; run < runs; run++) {
        await writeFile(file, serializeDocument(design));
        const app = await _electron.launch({
          args: ['-r', hook, appDir, `--user-data-dir=${join(dir, `user-data-${run}`)}`, file],
          env: { ...process.env, VISION_ACTIVITY_SOCKET: join(dir, 'activity.sock') },
        });
        try {
          await measure(app, file, design, run, (metric, value) => {
            (samples[metric] ??= []).push(value);
          });
        } finally {
          await app.close();
        }
      }
      results[size] = samples;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

test.afterAll(async () => {
  const machine = `${cpus()[0]?.model ?? 'unknown CPU'}, ${runs} runs`;
  const summary = Object.fromEntries(
    Object.entries(results).map(([size, samples]) => [size, summarize(samples)]),
  );
  const markdown = formatReport(summary, machine);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, `bench-${stamp}.json`),
    `${JSON.stringify({ machine, results, summary }, null, 2)}\n`,
  );
  await writeFile(join(outDir, `bench-${stamp}.md`), markdown);
  process.stdout.write(`\n${markdown}\nSaved to ${join(outDir, `bench-${stamp}`)}.{json,md}\n`);
});

type Recorder = (metric: string, value: number) => void;

async function measure(
  app: ElectronApplication,
  file: string,
  design: VisionDocument,
  run: number,
  record: Recorder,
): Promise<void> {
  const started = performance.now();
  const window = await app.firstWindow();
  await waitForVisibleArtboards(window, design);
  record('open (ms)', performance.now() - started);

  await pause(window, settleMs);
  await recordMemory(app, window, 'fit', record);

  const edited = structuredClone(design);
  const title = textNode(edited, cardTitleId(0, 0, 0));
  title.text = `Edited in run ${run}`;
  record(
    'save, edit 1 node (ms)',
    await save(window, file, edited, { artboard: artboardId(0), node: title.id, text: title.text }),
  );

  const added = structuredClone(edited);
  const batch = fiftyNodes(run);
  added.pages[0]?.artboards[0]?.children.unshift(batch);
  const last = batch.children?.at(-1);
  record(
    'save, add 50 nodes (ms)',
    await save(window, file, added, {
      artboard: artboardId(0),
      node: last?.id ?? '',
      text: last?.type === 'text' ? last.text : '',
    }),
  );

  await pause(window, settleMs);
  recordFrames('zoom', await gesture(window, 'zoom'), record);

  await window.getByRole('button', { name: /^Zoom \d+%, reset to 100%/ }).click();
  await waitForVisibleArtboards(window, design);
  await pause(window, settleMs);
  await recordMemory(app, window, '100%', record);
  record('layers, select by canvas click at depth 7 (ms)', await selectDeepNode(window));
  recordFrames('pan at 100%', await gesture(window, 'pan'), record);
  record('layers, expand every artboard (ms)', await expandArtboards(window, design));

  await pause(window, settleMs);
  const fitStarted = performance.now();
  await window.getByRole('button', { name: 'Zoom to fit' }).click();
  await waitForVisibleArtboards(window, design);
  record('zoom to fit from 100% (ms)', performance.now() - fitStarted);
}

interface Shown {
  artboard: string;
  node: string;
  text: string;
}

async function save(
  window: Page,
  file: string,
  design: VisionDocument,
  shown: Shown,
): Promise<number> {
  const temp = `${file}.tmp`;
  await writeFile(temp, serializeDocument(design));
  const started = performance.now();
  await rename(temp, file);
  await window.waitForFunction(
    ({ artboard, node, text }) =>
      document
        .querySelector<HTMLIFrameElement>(`iframe[data-artboard-id="${artboard}"]`)
        ?.contentDocument?.querySelector(`[data-node-id="${node}"]`)?.textContent === text,
    shown,
    { polling: 'raf' },
  );
  await nextFrame(window);
  return performance.now() - started;
}

async function waitForVisibleArtboards(window: Page, design: VisionDocument): Promise<void> {
  const args = {
    artboards: (design.pages[0]?.artboards ?? []).map(({ id, x, y }) => ({ id, x, y })),
    width: artboardWidth,
    height: artboardHeight,
  };
  try {
    await window.waitForFunction(
      undrawnArtboards,
      { ...args, waiting: true },
      {
        polling: 'raf',
        timeout: 60_000,
      },
    );
  } catch (error) {
    const undrawn = await window
      .evaluate(undrawnArtboards, { ...args, waiting: false })
      .catch(() => ['the window']);
    throw new Error(`Not drawn: ${Array.isArray(undrawn) ? undrawn.join(', ') : 'nothing'}`, {
      cause: error,
    });
  }
  await nextFrame(window);
}

// Self-contained, since it runs in the page: while waiting it returns whether everything is
// drawn, otherwise what isn't.
function undrawnArtboards({
  artboards,
  width,
  height,
  waiting,
}: {
  artboards: { id: string; x: number; y: number }[];
  width: number;
  height: number;
  waiting: boolean;
}): string[] | boolean {
  const problems = findProblems();
  return waiting ? problems.length === 0 : problems;

  function findProblems(): string[] {
    const canvas = document.querySelector('[role="region"][aria-label="Canvas"]');
    const layer = canvas?.querySelector<HTMLElement>('[style*="scale("]');
    const match = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.e-]+)\)/.exec(
      layer?.style.transform ?? '',
    );
    if (!canvas || !match) return ['the canvas'];
    const [x, y, zoom] = match.slice(1).map(Number) as [number, number, number];
    const view = canvas.getBoundingClientRect();
    const visible = artboards.filter(
      (artboard) =>
        x + (artboard.x + width) * zoom > 0 &&
        x + artboard.x * zoom < view.width &&
        y + (artboard.y + height) * zoom > 0 &&
        y + artboard.y * zoom < view.height,
    );
    if (visible.length === 0) return ['any artboard on screen'];
    return visible.flatMap(({ id }) => {
      const doc = document.querySelector<HTMLIFrameElement>(
        `iframe[data-artboard-id="${id}"]`,
      )?.contentDocument;
      const root = doc?.querySelector('[data-artboard]');
      if (doc == null || root == null || root.childElementCount === 0) return [`${id} (nodes)`];
      if ((doc.querySelector('style')?.textContent.length ?? 0) === 0) return [`${id} (styles)`];
      const loading = Array.from(doc.images).filter((image) => !image.complete).length;
      return loading > 0 ? [`${id} (${loading} images)`] : [];
    });
  }
}

async function gesture(window: Page, kind: 'pan' | 'zoom'): Promise<number[]> {
  return window.evaluate(
    ({ kind, duration }) => {
      const canvas = document.querySelector('[role="region"][aria-label="Canvas"]');
      if (canvas === null) throw new Error('No canvas');
      const box = canvas.getBoundingClientRect();
      const center = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
      const frames: number[] = [];
      return new Promise<number[]>((resolve) => {
        let start: number | undefined;
        let previous: number | undefined;
        const tick = (now: number) => {
          start ??= now;
          if (previous !== undefined) frames.push(now - previous);
          const elapsed = now - start;
          const step = now - (previous ?? now);
          previous = now;
          if (elapsed >= duration) {
            resolve(frames);
            return;
          }
          const firstHalf = elapsed < duration / 2;
          canvas.dispatchEvent(
            new WheelEvent(
              'wheel',
              kind === 'zoom'
                ? { ...center, deltaY: (firstHalf ? -0.21 : 0.21) * step, ctrlKey: true }
                : { ...center, deltaX: (firstHalf ? 1.6 : -1.6) * step },
            ),
          );
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    { kind, duration: gestureMs },
  );
}

function recordFrames(name: string, frames: number[], record: Recorder): void {
  const sorted = frames.toSorted((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  record(`${name}, frame p50 (ms)`, at(0.5));
  record(`${name}, frame p95 (ms)`, at(0.95));
  record(
    `${name}, frames over 16.7 ms (%)`,
    (100 * frames.filter((frame) => frame > 16.7).length) / Math.max(1, frames.length),
  );
}

async function recordMemory(
  app: ElectronApplication,
  window: Page,
  state: string,
  record: Recorder,
): Promise<void> {
  const workingSetKb = await app.evaluate(({ app }) =>
    app.getAppMetrics().reduce((total, metric) => total + metric.memory.workingSetSize, 0),
  );
  const cdp = await window.context().newCDPSession(window);
  await cdp.send('HeapProfiler.collectGarbage');
  const heap = await cdp.send('Runtime.getHeapUsage');
  await cdp.detach();
  record(`memory at ${state}, all processes (MB)`, workingSetKb / 1024);
  record(`memory at ${state}, renderer JS heap (MB)`, heap.usedSize / 1024 / 1024);
}

async function selectDeepNode(window: Page): Promise<number> {
  const target = await window.evaluate(() => {
    const canvas = document
      .querySelector('[role="region"][aria-label="Canvas"]')
      ?.getBoundingClientRect();
    if (canvas === undefined) return null;
    for (const frame of document.querySelectorAll<HTMLIFrameElement>('iframe[data-artboard-id]')) {
      const box = frame.getBoundingClientRect();
      const scale = box.width / frame.offsetWidth;
      for (const label of frame.contentDocument?.querySelectorAll(
        '[data-node-id$="-badge-label"]',
      ) ?? []) {
        const rect = label.getBoundingClientRect();
        const x = box.left + (rect.left + rect.width / 2) * scale;
        const y = box.top + (rect.top + rect.height / 2) * scale;
        if (
          x > canvas.left + 40 &&
          x < canvas.right - 40 &&
          y > canvas.top + 40 &&
          y < canvas.bottom - 40
        )
          return { id: label.getAttribute('data-node-id') ?? '', x, y };
      }
    }
    return null;
  });
  if (target === null) throw new Error('No badge label is on screen to click');
  const started = performance.now();
  await window.mouse.click(target.x, target.y);
  await window
    .locator(`[role="treeitem"][data-layer-id="${target.id}"][aria-selected="true"]`)
    .waitFor();
  await nextFrame(window);
  return performance.now() - started;
}

async function expandArtboards(window: Page, design: VisionDocument): Promise<number> {
  const started = performance.now();
  for (const artboard of design.pages[0]?.artboards ?? []) {
    const row = window.locator(`[role="treeitem"][data-layer-id="${artboard.id}"]`);
    if ((await row.getAttribute('aria-expanded')) === 'true') continue;
    await row.locator('span').first().click();
    await window
      .locator(`[role="treeitem"][data-layer-id="${artboard.children[0]?.id ?? ''}"]`)
      .waitFor();
  }
  await nextFrame(window);
  return performance.now() - started;
}

function fiftyNodes(run: number): FrameNode {
  return {
    type: 'frame',
    id: `added-${run}`,
    class: `grid grid-cols-7 gap-[${run + 3}px] p-[${run + 11}px]`,
    children: Array.from({ length: 49 }, (_, index) => ({
      type: 'text' as const,
      id: `added-${run}-${index}`,
      class: `text-[${(index % 7) + 10}px] text-fg-muted`,
      text: `Added ${run}.${index}`,
    })),
  };
}

function textNode(design: VisionDocument, id: string): { id: string; text: string } {
  const artboards = design.pages.flatMap((page) => page.artboards);
  const search = (nodes: FrameNode['children']): { id: string; text: string } | undefined => {
    for (const node of nodes ?? []) {
      if (node.id === id && node.type === 'text') return node;
      const found = node.type === 'frame' ? search(node.children) : undefined;
      if (found !== undefined) return found;
    }
    return undefined;
  };
  for (const artboard of artboards) {
    const found = search(artboard.children);
    if (found !== undefined) return found;
  }
  throw new Error(`No text node "${id}"`);
}

async function nextFrame(window: Page): Promise<void> {
  await window.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function pause(window: Page, ms: number): Promise<void> {
  await window.waitForTimeout(ms);
}
